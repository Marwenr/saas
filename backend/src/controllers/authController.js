/**
 * Authentication controller
 */
import User from '../models/User.js';

/**
 * Register a new user
 */
export async function register(request, reply) {
  try {
    const { email, password, name } = request.body;

    // Validate input
    if (!email || !password) {
      return reply.code(400).send({
        error: 'Email and password are required',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return reply.code(409).send({
        error: 'User with this email already exists',
      });
    }

    // Create user
    const user = await User.create({
      email,
      password,
      name: name || '',
    });

    // Generate tokens
    const accessToken = request.server.jwt.sign(
      {
        userId: user._id,
        companyId: user.companyId ? user.companyId.toString() : null,
        role: user.role || 'owner',
      },
      { expiresIn: '15m' }
    );

    const refreshToken = request.server.jwt.sign(
      {
        userId: user._id,
        companyId: user.companyId ? user.companyId.toString() : null,
      },
      { expiresIn: '30d' }
    );

    // Set secure cookies
    // Use 'none' for cross-origin in production, 'strict' for same-origin in development
    const isProduction = process.env.NODE_ENV === 'production';
    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    return reply.code(201).send({
      message: 'User registered successfully',
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
      },
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Login user
 */
export async function login(request, reply) {
  try {
    const { email, password } = request.body;

    // Validate input
    if (!email || !password) {
      return reply.code(400).send({
        error: 'Email and password are required',
      });
    }

    // Find user and include password
    const user = await User.findOne({ email })
      .select('+password')
      .populate('companyId');
    if (!user) {
      return reply.code(401).send({
        error: 'email invalide',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return reply.code(401).send({
        error: 'password invalide',
      });
    }

    // Generate tokens
    const accessToken = request.server.jwt.sign(
      {
        userId: user._id,
        companyId: user.companyId ? user.companyId.toString() : null,
        role: user.role || 'owner',
      },
      { expiresIn: '15m' }
    );

    const refreshToken = request.server.jwt.sign(
      {
        userId: user._id,
        companyId: user.companyId ? user.companyId.toString() : null,
      },
      { expiresIn: '30d' }
    );

    // Set secure cookies
    // Use 'none' for cross-origin in production, 'strict' for same-origin in development
    const isProduction = process.env.NODE_ENV === 'production';
    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 30 * 24 * 60 * 60, // 30 days
      path: '/',
    });

    // Build response
    const response = {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'owner',
        companyId: user.companyId ? user.companyId._id.toString() : null,
      },
    };

    // Include company information if user has a company
    if (user.companyId) {
      response.company = {
        id: user.companyId._id,
        name: user.companyId.name,
        email: user.companyId.email,
        phone: user.companyId.phone,
        address: user.companyId.address,
        country: user.companyId.country,
        taxId: user.companyId.taxId,
        subscriptionPlan: user.companyId.subscriptionPlan,
        isActive: user.companyId.isActive,
      };
    }

    return reply.send(response);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Refresh access token
 */
export async function refresh(request, reply) {
  try {
    const refreshToken = request.cookies.refreshToken;

    if (!refreshToken) {
      return reply.code(401).send({
        error: 'Refresh token not provided',
      });
    }

    // Verify refresh token
    const decoded = request.server.jwt.verify(refreshToken);
    const user = await User.findById(decoded.userId);

    if (!user) {
      return reply.code(401).send({
        error: 'Invalid refresh token',
      });
    }

    // Generate new access token
    const accessToken = request.server.jwt.sign(
      {
        userId: user._id,
        companyId: user.companyId ? user.companyId.toString() : null,
        role: user.role || 'owner',
      },
      { expiresIn: '15m' }
    );

    // Set new access token cookie
    // Use 'none' for cross-origin in production, 'strict' for same-origin in development
    const isProduction = process.env.NODE_ENV === 'production';
    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    return reply.send({
      message: 'Token refreshed successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(401).send({
      error: 'Invalid or expired refresh token',
    });
  }
}

/**
 * Get current user
 */
export async function me(request, reply) {
  try {
    const user = await User.findById(request.user.userId).populate('companyId');

    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }

    const response = {
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role || 'owner',
        companyId: user.companyId ? user.companyId._id.toString() : null,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    };

    // Include company information if user has a company
    if (user.companyId) {
      response.company = {
        id: user.companyId._id,
        name: user.companyId.name,
        email: user.companyId.email,
        phone: user.companyId.phone,
        address: user.companyId.address,
        country: user.companyId.country,
        taxId: user.companyId.taxId,
        subscriptionPlan: user.companyId.subscriptionPlan,
        isActive: user.companyId.isActive,
      };
    }

    return reply.send(response);
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Logout user
 */
export async function logout(request, reply) {
  try {
    // Clear cookies with the same options used in login/register
    // This ensures cookies are properly cleared regardless of their current state
    const isProduction = process.env.NODE_ENV === 'production';
    reply.clearCookie('accessToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      path: '/',
    });

    reply.clearCookie('refreshToken', {
      httpOnly: true,
      secure: isProduction,
      sameSite: isProduction ? 'none' : 'strict',
      path: '/',
    });

    return reply.send({ success: true });
  } catch (err) {
    request.log.error({ err }, 'Error during logout');
    // Even if something goes wrong, we don't want to block logout from frontend
    // Return success to ensure idempotency
    return reply.send({ success: true });
  }
}
