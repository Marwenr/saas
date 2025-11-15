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
      { id: user._id, email: user.email },
      { expiresIn: '15m' }
    );

    const refreshToken = request.server.jwt.sign(
      { id: user._id },
      { expiresIn: '7d' }
    );

    // Set secure cookies
    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
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
    const user = await User.findOne({ email }).select('+password');
    if (!user) {
      return reply.code(401).send({
        error: 'Invalid email or password',
      });
    }

    // Verify password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      return reply.code(401).send({
        error: 'Invalid email or password',
      });
    }

    // Generate tokens
    const accessToken = request.server.jwt.sign(
      { id: user._id, email: user.email },
      { expiresIn: '15m' }
    );

    const refreshToken = request.server.jwt.sign(
      { id: user._id },
      { expiresIn: '7d' }
    );

    // Set secure cookies
    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 15 * 60, // 15 minutes
      path: '/',
    });

    reply.setCookie('refreshToken', refreshToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60, // 7 days
      path: '/',
    });

    return reply.send({
      message: 'Login successful',
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
    const user = await User.findById(decoded.id);

    if (!user) {
      return reply.code(401).send({
        error: 'Invalid refresh token',
      });
    }

    // Generate new access token
    const accessToken = request.server.jwt.sign(
      { id: user._id, email: user.email },
      { expiresIn: '15m' }
    );

    // Set new access token cookie
    reply.setCookie('accessToken', accessToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
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
    const user = await User.findById(request.user.id);

    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }

    return reply.send({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
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
 * Logout user
 */
export async function logout(request, reply) {
  reply.clearCookie('accessToken', { path: '/' });
  reply.clearCookie('refreshToken', { path: '/' });

  return reply.send({
    message: 'Logout successful',
  });
}
