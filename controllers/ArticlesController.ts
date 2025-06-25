import type { FastifyRequest, FastifyReply } from "fastify";
import { asyncHandle, successHandle, errorHandle } from "../utils/asyncHandler.ts";
import { createArticle, getLatestArticles, getArticleById, searchArticles, getArticlesByCategory, LikeArticle, CheckLikeStatus, UnlikeArticle, BookmarkArticle, UnbookmarkArticle, CheckBookmarkStatus, updateArticle, deleteArticle } from "../services/ArticlesService.ts";
import type { Article } from "../services/ArticlesService.ts";
import supabase from "../utils/supabase.ts";
import type { articleCategory } from "../generated/prisma/index.js";

export const createArticleController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    let data = req.body as Article;
    let fileUrl: string | null = null;
    let fileExt: string | null = null;

    if (req.isMultipart()) {
        const DATA = await req.file();
        if (!DATA) {
            return errorHandle("No image file provided", res, 400);
        }
        const fields = DATA.fields;

        const getFieldValue = (field: any): string => {
            if (typeof field === 'string') return field;
            if (field && typeof field.value === 'string') return field.value;
            return '';
        };

        const articleData: Article = {
            title: getFieldValue(fields.title),
            content: getFieldValue(fields.content),
            doctorId: getFieldValue(fields.doctorId),
            imageUrl: '',
            category: getFieldValue(fields.category) as string
        }

        // Validate required fields
        if (!articleData.title || !articleData.content || !articleData.doctorId || !articleData.category) {
            return errorHandle("Title, content, doctorId, and category are required", res, 400);
        }

        try {
            const FileBuffer = await DATA.toBuffer();
            fileExt = DATA.filename?.split('.').pop() || 'jpg';
            const fileName = `articles/${Date.now()}_${Math.random().toString(36).substring(7)}.${fileExt}`;

            // Upload file to Supabase
            const { data: uploadData, error: uploadError } = await supabase.storage
                .from('kitadocs')
                .upload(fileName, FileBuffer, {
                    contentType: DATA.mimetype || 'image/jpeg',
                    upsert: false
                });

            if (uploadError) {
                console.error("Upload error:", uploadError);
                return errorHandle("Failed to upload image", res, 500);
            }

            // Get public URL
            const { data: publicUrlData } = supabase.storage
                .from('kitadocs')
                .getPublicUrl(fileName);

            fileUrl = publicUrlData.publicUrl;
            articleData.imageUrl = fileUrl;
            data = articleData;
        } catch (uploadError) {
            console.error("File upload error:", uploadError);
            return errorHandle("Failed to process image upload", res, 500);
        }
    } else {
        // Validate required fields for non-multipart requests
        if (!data.title || !data.content || !data.doctorId || !data.category) {
            return errorHandle("Title, content, doctorId, and category are required", res, 400);
        }
    }

    const result = await createArticle(data);

    if (typeof result === "string") {
        return errorHandle(result, res, 400);
    }

    return successHandle({
        message: "Article created successfully",
        article: result,
        imageUrl: fileUrl
    }, res, 201);
});

export const getLatestArticlesController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    console.log("Fetching latest articles");
    const articles = await getLatestArticles(1,10);
    if (typeof articles === "string") {
        return errorHandle(articles, res, 400);
    }
    return successHandle({
        message: "Latest articles fetched successfully",
        articles: articles
    }, res, 200);
});

export const getArticleByIdController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { id } = req.params as { id: string };
    if (!id) {
        return errorHandle("Article ID is required", res, 400);
    }

    const article = await getArticleById(id);
    if (typeof article === "string") {
        return errorHandle(article, res, 400);
    }

    return successHandle({
        message: "Article fetched successfully",
        article: article
    }, res, 200);
});

export const searchArticlesController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { query } = req.query as { query: string };
    console.log("Search query:", query);
    if (!query) {
        return errorHandle("Search query is required", res, 400);
    }

    const articles = await searchArticles(query);
    if (typeof articles === "string") {
        return errorHandle(articles, res, 400);
    }

    return successHandle({
        message: "Articles fetched successfully",
        articles: articles
    }, res, 200);
});

export const getArticlesByCategoryController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { category } = req.params as { category: articleCategory };
    if (!category) {
        return errorHandle("Category is required", res, 400);
    }

    const articles = await getArticlesByCategory(category);
    if (typeof articles === "string") {
        return errorHandle(articles, res, 400);
    }

    return successHandle({
        message: "Articles fetched successfully",
        articles: articles
    }, res, 200);
});

export const likeArticleController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { articleId } = req.params as { articleId: string };
    const userId = req.user?.id; // Assuming user ID is available in request context

    console.error("Like article request:", { articleId, userId });

    if (!articleId || !userId) {
        return errorHandle("Article ID and user ID are required", res, 400);
    }

    const likeStatus = await CheckLikeStatus(articleId, userId);
    if (typeof likeStatus === "string") {
        return errorHandle(likeStatus, res, 400);
    }
    if (likeStatus) {
        return errorHandle("Article already liked", res, 400);
    }
    const result = await LikeArticle(articleId, userId);
    if (typeof result === "string") {
        return errorHandle(result, res, 400);
    }

    return successHandle({
        message: "Article liked successfully",
        likeStatus: result
    }, res, 200);
});

export const unlikeArticleController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { articleId } = req.params as { articleId: string };
    const userId = req.user?.id; // Assuming user ID is available in request context

    if (!articleId || !userId) {
        return errorHandle("Article ID and user ID are required", res, 400);
    }

    const likeStatus = await CheckLikeStatus(articleId, userId);
    if (typeof likeStatus === "string") {
        return errorHandle(likeStatus, res, 400);
    }
    if (!likeStatus) {
        return errorHandle("Article not liked yet", res, 400);
    }

    const result = await UnlikeArticle(articleId, userId);
    if (typeof result === "string") {
        return errorHandle(result, res, 400);
    }

    return successHandle({
        message: "Article unliked successfully",
        unlikeStatus: result
    }, res, 200);
});

export const checkLikeStatusController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { articleId } = req.params as { articleId: string };
    const userId = req.user?.id; // Assuming user ID is available in request context

    console.log("Checking like status for articleId:", articleId, "and userId:", userId);

    if (!articleId || !userId) {
        return errorHandle("Article ID and user ID are required", res, 400);
    }

    const likeStatus = await CheckLikeStatus(articleId, userId);
    if (typeof likeStatus === "string") {
        return errorHandle(likeStatus, res, 400);
    }

    return successHandle({
        message: "Like status checked successfully",
        liked: likeStatus
    }, res, 200);
});

export const bookmarkArticleController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { articleId } = req.params as { articleId: string };
    const userId = req.user?.id; // Assuming user ID is available in request context

    if (!articleId || !userId) {
        return errorHandle("Article ID and user ID are required", res, 400);
    }

    const bookmarkStatus = await CheckBookmarkStatus(articleId, userId);
    if (typeof bookmarkStatus === "string") {
        return errorHandle(bookmarkStatus, res, 400);
    }
    if (bookmarkStatus) {
        return errorHandle("Article already bookmarked", res, 400);
    }

    const result = await BookmarkArticle(articleId, userId);
    if (typeof result === "string") {
        return errorHandle(result, res, 400);
    }

    return successHandle({
        message: "Article bookmarked successfully",
        bookmarkStatus: result
    }, res, 200);
});

export const unbookmarkArticleController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { articleId } = req.params as { articleId: string };
    const userId = req.user?.id; // Assuming user ID is available in request context

    if (!articleId || !userId) {
        return errorHandle("Article ID and user ID are required", res, 400);
    }

    const bookmarkStatus = await CheckBookmarkStatus(articleId, userId);
    if (typeof bookmarkStatus === "string") {
        return errorHandle(bookmarkStatus, res, 400);
    }
    if (!bookmarkStatus) {
        return errorHandle("Article not bookmarked yet", res, 400);
    }

    const result = await UnbookmarkArticle(articleId, userId);
    if (typeof result === "string") {
        return errorHandle(result, res, 400);
    }

    return successHandle({
        message: "Article unbookmarked successfully",
        unbookmarkStatus: result
    }, res, 200);
});

export const checkBookmarkStatusController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { articleId } = req.params as { articleId: string };
    const userId = req.user?.id; // Assuming user ID is available in request context

    if (!articleId || !userId) {
        return errorHandle("Article ID and user ID are required", res, 400);
    }

    const bookmarkStatus = await CheckBookmarkStatus(articleId, userId);
    if (typeof bookmarkStatus === "string") {
        return errorHandle(bookmarkStatus, res, 400);
    }

    return successHandle({
        message: "Bookmark status checked successfully",
        bookmarked: bookmarkStatus
    }, res, 200);
});

export const editArticleController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    console.log("entered")
    const data = {} as any
    const Title = (req.body as any).title as string;
    const Content = (req.body as any).content as string;
    const Category = (req.body as any).category as articleCategory;
    const ArticleId = (req.body as any).id as string;

    console.log("Edit article request:", { Title, Content, Category, ArticleId });

    if (!Title || !Content || !Category || !ArticleId) {
        return errorHandle("All fields are required", res, 400);
    }

    data.title = Title;
    data.content = Content;
    data.category = Category;

    const result = await updateArticle(ArticleId, data);
    if (typeof result === "string") {
        return errorHandle(result, res, 400);
    }
    if (!result.data) {
        return errorHandle("Article not found", res, 404);
    }

    return successHandle({
        message: "Article updated successfully",
        article: result.data
    }, res, 200);
});

export const deleteArticleController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const { id } = req.params as { id: string };
    if (!id) {
        return errorHandle("Article ID is required", res, 400);
    }
    const result = await deleteArticle(id);
    if (result === 'Article deleted successfully') {
        return successHandle({
            message: "Article deleted successfully",
            articleId: id
        }, res, 200);
    } else if (typeof result === "string") {
        return errorHandle(result, res, 400);
    }
});

export const getAllArticlesController = asyncHandle(async (req: FastifyRequest, res: FastifyReply) => {
    const page = Number((req.query as any).page) || 0; // Default to page 0 if not provided
    console.log("Fetching all articles for page:", page);
    const articles = await getLatestArticles(page, 10); // Fetching articles for the current page
    if (typeof articles === "string") {
        return errorHandle(articles, res, 400);
    }
    return successHandle({
        message: "All articles fetched successfully",
        articles: articles,
        page: page,
        skipped: page * 10,
        totalPages: Math.ceil(articles.totalArticles / 10) // Assuming articles.length gives total articles
    }, res, 200);
});