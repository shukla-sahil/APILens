const { supabase, isSupabaseConfigured } = require('../config/supabase');
const AppError = require('../utils/app-error');

async function requireAuth(req, _res, next) {
  try {
    if (!isSupabaseConfigured) {
      req.user = {
        id: req.header('x-dev-user-id') || 'local-dev-user',
        email: 'local@apilens.dev'
      };
      next();
      return;
    }

    const authHeader = req.header('authorization') || '';
    if (!authHeader.startsWith('Bearer ')) {
      next(new AppError('Authorization token is required', 401));
      return;
    }

    const token = authHeader.slice(7).trim();
    if (!token) {
      next(new AppError('Authorization token is required', 401));
      return;
    }

    const {
      data: { user },
      error
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      next(new AppError('Invalid or expired authentication token', 401, error?.message));
      return;
    }

    req.user = user;
    next();
  } catch (error) {
    next(error);
  }
}

module.exports = {
  requireAuth
};