const express = require('express');

const asyncHandler = require('../middleware/async-handler');
const { requireAuth } = require('../middleware/auth-handler');
const AppError = require('../utils/app-error');
const repository = require('../repositories/project.repository');
const { chatWithApi } = require('../services/chat.service');
const { resolveMockResponse } = require('../services/mock.service');

const router = express.Router();

router.use(requireAuth);

router.post(
  '/project/:id/chat',
  asyncHandler(async (req, res) => {
    const question = req.body?.question;
    if (!question) {
      throw new AppError('question is required', 400);
    }

    const projectData = await repository.getProjectWithDetails(req.params.id, req.user.id);
    if (!projectData) {
      throw new AppError('Project not found', 404);
    }

    const chatResponse = await chatWithApi({
      question,
      projectData
    });

    res.json(chatResponse);
  })
);

router.all(
  '/project/:id/mock/*',
  asyncHandler(async (req, res) => {
    const projectData = await repository.getProjectWithDetails(req.params.id, req.user.id);
    if (!projectData) {
      throw new AppError('Project not found', 404);
    }

    const requestPath = `/${req.params[0] || ''}`;
    const mock = resolveMockResponse(projectData.endpoints, req.method, requestPath);

    if (!mock) {
      throw new AppError(`No mock endpoint found for ${req.method.toUpperCase()} ${requestPath}`, 404);
    }

    res.status(mock.statusCode).json({
      mocked: true,
      endpoint: mock.endpoint,
      data: mock.body
    });
  })
);

module.exports = router;
