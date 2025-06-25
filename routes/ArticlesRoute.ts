import type { FastifyInstance } from "fastify";
import { createArticleController, getLatestArticlesController, getArticleByIdController, searchArticlesController, getArticlesByCategoryController, likeArticleController, unlikeArticleController, checkLikeStatusController, bookmarkArticleController, unbookmarkArticleController, checkBookmarkStatusController, editArticleController, deleteArticleController, getAllArticlesController } from "../controllers/ArticlesController.ts";
import { AuthChecker } from "../utils/authChecker.ts";
import { UserAuthChecker } from "../utils/usersAuth.ts";

export const articlesRoute = async (fastify: FastifyInstance) => {

    fastify.get("/articles", getLatestArticlesController);
    fastify.get("/articles/all", getAllArticlesController);
    fastify.get("/articles/search", searchArticlesController);
    fastify.get("/articles/:id", getArticleByIdController);
    fastify.get("/articles/category/:category", getArticlesByCategoryController);


    fastify.post("/articles/:articleId/like", {preHandler: UserAuthChecker},likeArticleController);
    fastify.post("/articles/:articleId/unlike",{preHandler:UserAuthChecker} ,unlikeArticleController);
    fastify.get("/articles/:articleId/like-status", {preHandler: UserAuthChecker} ,checkLikeStatusController);

    fastify.post("/articles/:articleId/bookmark", {preHandler: UserAuthChecker}, bookmarkArticleController);
    fastify.post("/articles/:articleId/unbookmark", {preHandler: UserAuthChecker}, unbookmarkArticleController);
    fastify.get("/articles/:articleId/bookmark-status", {preHandler: UserAuthChecker}, checkBookmarkStatusController);

    fastify.post("/articles",{preHandler:AuthChecker} ,createArticleController);
    fastify.post("/articles/edit", {preHandler: AuthChecker}, editArticleController);
    fastify.delete("/articles/:id", {preHandler: AuthChecker}, deleteArticleController);
};