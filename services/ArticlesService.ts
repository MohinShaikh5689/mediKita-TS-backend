import { PrismaClient } from "../generated/prisma/index.js"
import { articleCategory } from "../generated/prisma/index.js";
const Prisma = new PrismaClient();

export interface Article {
    title: string;
    content: string;
    doctorId: string;
    imageUrl: string;
    category: string;
}

export const createArticle = async (data:Article) => {
    console.log("Creating article with data:", data);
    try {
         const Article = await Prisma.articles.create({
            data: {
                title: data.title,
                content: data.content,
                doctorId: data.doctorId,
                imageUrl: data.imageUrl,
                category: data.category as articleCategory
            }
        });
        return {
            data: Article,
            message: "Article created successfully"
        }
    } catch (error:unknown) {
        console.error("Error creating article:", error);
        return "Failed to create article";     
    }
}

export const getLatestArticles = async (skip:number, limit: number = 10) => {
    
    try {
        const totalArticles = await Prisma.articles.count();
        const articles = await Prisma.articles.findMany({
            orderBy: {
                createdAt: 'desc'
            },select:{
                id: true,
                title: true,
                content: true,
                imageUrl: true,
                category: true,
                createdAt: true,
                doctor:{
                    select: {
                        id: true,
                        FullName: true,
                        Credentials: true,
                        verificationStatus: true,
                    }
                }
            },
            skip: (skip-1) * 10,
            take: limit
        });
        return {
            data: articles,
            totalArticles: totalArticles,
        };
    } catch (error:unknown) {
        console.error("Error fetching latest articles:", error);
        return "Failed to fetch latest articles";
    }
}

export const getArticleById = async (id: string) => {
    try {
        const article = await Prisma.articles.findUnique({
            where: { id },
            select: {
                id: true,
                title: true,
                content: true,
                imageUrl: true,
                category: true,
                createdAt: true,
                doctor: {
                    select: {
                        id: true,
                        FullName: true,
                        Credentials: true,
                        verificationStatus: true,
                    }
                }
            }
        });
        return article;
    } catch (error:unknown) {
        console.error("Error fetching article by ID:", error);
        return "Failed to fetch article";
    }
};

export const searchArticles = async (query: string) => {
    try {
        const articles = await Prisma.articles.findMany({
            where: {
                OR: [
                    { title: { contains: query, mode: 'insensitive' } },
                    { content: { contains: query, mode: 'insensitive' } },
                    { doctor: { FullName: { contains: query, mode: 'insensitive' } } }
                ]
            },
            select: {
                id: true,
                title: true,
                content: true,
                imageUrl: true,
                category: true,
                createdAt: true,
                doctor: {
                    select: {
                        id: true,
                        FullName: true,
                        Credentials: true,
                        verificationStatus: true,
                    }
                }
            }
        });
        return articles;
    } catch (error) {
        console.error("Error searching articles:", error);
        return "Failed to search articles";
    }
}

export const getArticlesByCategory = async (category: articleCategory) => {
    try {
        const articles = await Prisma.articles.findMany({
            where: { category },
            select: {
                id: true,
                title: true,
                content: true,
                imageUrl: true,
                createdAt: true,
                doctor: {
                    select: {
                        id: true,
                        FullName: true,
                        Credentials: true,
                        verificationStatus: true,
                    }
                }
            }
        });
        return articles;
    } catch (error) {
        console.error("Error fetching articles by category:", error);
        return "Failed to fetch articles by category";
    }
};

export const LikeArticle = async (articleId: string, userId: string) => {
    try {
        const like = await Prisma.articleLike.create({
            data: {
                articleId,
                userId
            }
        });
        return like;
    } catch (error) {
        console.error("Error liking article:", error);
        return "Failed to like article";
    }
}

export const UnlikeArticle = async (articleId: string, userId: string) => {
    try {
        const unlike = await Prisma.articleLike.deleteMany({
            where: {
                articleId,
                userId
            }
        });
        return unlike;
    } catch (error) {
        console.error("Error unliking article:", error);
        return "Failed to unlike article";
    }
}

export const CheckLikeStatus = async (articleId: string, userId: string) => {
    try {
        const like = await Prisma.articleLike.findFirst({
            where: {
                articleId,
                userId
            }
        });
        return like ? true : false;
    } catch (error) {
        console.error("Error checking like status:", error);
        return "Failed to check like status";
    }
};

export const BookmarkArticle = async (articleId: string, userId: string) => {
    try {
        const bookmark = await Prisma.articleSave.create({
            data: {
                articleId,
                userId
            }
        });
        return bookmark;
    } catch (error) {
        console.error("Error bookmarking article:", error);
        return "Failed to bookmark article";
    }
}

export const UnbookmarkArticle = async (articleId: string, userId: string) => {
    try {
        const unbookmark = await Prisma.articleSave.deleteMany({
            where: {
                articleId,
                userId
            }
        });
        return unbookmark;
    } catch (error) {
        console.error("Error unbookmarking article:", error);
        return "Failed to unbookmark article";
    }
}

export const CheckBookmarkStatus = async (articleId: string, userId: string) => {
    try {
        const bookmark = await Prisma.articleSave.findFirst({
            where: {
                articleId,
                userId
            }
        });
        return bookmark ? true : false;
    } catch (error) {
        console.error("Error checking bookmark status:", error);
        return "Failed to check bookmark status";
    }
}

export const updateArticle = async (id: string, data: Partial<Article>) => {
    try {
        const updatedArticle = await Prisma.articles.update({
            where: { id },
            data: {
                title: data.title,
                content: data.content,
                category: data.category as articleCategory
            }
        });
        return {
            data: updatedArticle,
            message: "Article updated successfully"
        };
    } catch (error) {
        console.error("Error updating article:", error);
        return "Failed to update article";
    }
}

export const deleteArticle = async (id: string) => {
    try {
        await Prisma.articles.delete({
            where: { id }
        });
        return "Article deleted successfully";
    } catch (error) {
        console.error("Error deleting article:", error);
        return "Failed to delete article";
    }
}