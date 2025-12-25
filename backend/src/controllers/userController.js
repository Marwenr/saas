/**
 * User management controller
 * Only owners can manage users within their company
 */
import User from '../models/User.js';

/**
 * Middleware to check if user is owner
 */
export async function requireOwner(request, reply) {
  try {
    if (request.user.role !== 'owner') {
      return reply.code(403).send({
        error: 'Only owners can manage users',
      });
    }
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Get all users for the owner's company
 */
export async function getUsers(request, reply) {
  try {
    const owner = await User.findById(request.user.userId);

    if (!owner || owner.role !== 'owner') {
      return reply.code(403).send({
        error: 'Only owners can view users',
      });
    }

    if (!owner.companyId) {
      return reply.code(400).send({
        error: 'Owner must be associated with a company',
      });
    }

    // Get all users in the same company
    const users = await User.find({
      companyId: owner.companyId,
    }).select('-password'); // Exclude password from response

    return reply.send({
      users: users.map(user => ({
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      })),
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Create a new user in the owner's company
 */
export async function createUser(request, reply) {
  try {
    const owner = await User.findById(request.user.userId);

    if (!owner || owner.role !== 'owner') {
      return reply.code(403).send({
        error: 'Only owners can create users',
      });
    }

    if (!owner.companyId) {
      return reply.code(400).send({
        error: 'Owner must be associated with a company',
      });
    }

    const { email, password, name, role } = request.body;

    // Validate required fields
    if (!email || !password) {
      return reply.code(400).send({
        error: 'Email and password are required',
      });
    }

    // Validate role
    const allowedRoles = ['manager', 'cashier', 'storekeeper'];
    if (role && !allowedRoles.includes(role)) {
      return reply.code(400).send({
        error: `Role must be one of: ${allowedRoles.join(', ')}`,
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({
      email: email.toLowerCase().trim(),
    });
    if (existingUser) {
      return reply.code(409).send({
        error: 'User with this email already exists',
      });
    }

    // Create user in the same company
    const user = await User.create({
      email: email.toLowerCase().trim(),
      password,
      name: name || '',
      role: role || 'cashier', // Default role
      companyId: owner.companyId,
    });

    // Return user without password
    return reply.code(201).send({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    request.log.error(error);

    // Handle duplicate key errors
    if (error.code === 11000 || error.code === 11001) {
      return reply.code(409).send({
        error: 'User with this email already exists',
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Update a user
 */
export async function updateUser(request, reply) {
  try {
    const owner = await User.findById(request.user.userId);

    if (!owner || owner.role !== 'owner') {
      return reply.code(403).send({
        error: 'Only owners can update users',
      });
    }

    if (!owner.companyId) {
      return reply.code(400).send({
        error: 'Owner must be associated with a company',
      });
    }

    const { id } = request.params;
    const { email, password, oldPassword, newPassword, name, role } =
      request.body;

    // Find user and ensure they belong to the same company
    const user = await User.findOne({
      _id: id,
      companyId: owner.companyId,
    });

    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }

    // Prevent owner from modifying their own role
    if (user.role === 'owner' && role && role !== 'owner') {
      return reply.code(400).send({
        error: 'Cannot change owner role',
      });
    }

    // Validate role if provided
    const allowedRoles = ['manager', 'cashier', 'storekeeper'];
    if (role && !allowedRoles.includes(role) && role !== 'owner') {
      return reply.code(400).send({
        error: `Role must be one of: ${allowedRoles.join(', ')}`,
      });
    }

    // Update fields
    if (email) {
      // Check if new email already exists
      const existingUser = await User.findOne({
        email: email.toLowerCase().trim(),
        _id: { $ne: id },
      });
      if (existingUser) {
        return reply.code(409).send({
          error: 'User with this email already exists',
        });
      }
      user.email = email.toLowerCase().trim();
    }

    // Handle password change - requires old password verification
    // Only if newPassword or password is provided (i.e., user wants to change password)
    const wantsToChangePassword = newPassword || password;

    if (wantsToChangePassword) {
      // If changing password, oldPassword must be provided
      if (!oldPassword) {
        return reply.code(400).send({
          error: 'Ancien mot de passe requis pour changer le mot de passe',
        });
      }

      // Load user with password to verify old password
      const userWithPassword = await User.findById(user._id).select(
        '+password'
      );

      // Verify old password
      const isOldPasswordValid =
        await userWithPassword.comparePassword(oldPassword);
      if (!isOldPasswordValid) {
        return reply.code(401).send({
          error: 'Ancien mot de passe incorrect',
        });
      }

      // Set new password (will be hashed by pre-save hook)
      // Prefer newPassword over password (newPassword is the new format)
      user.password = newPassword || password;
    }

    if (name !== undefined) {
      user.name = name;
    }

    if (role && user.role !== 'owner') {
      user.role = role;
    }

    await user.save();

    // Return updated user without password
    return reply.send({
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        role: user.role,
        companyId: user.companyId,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    });
  } catch (error) {
    request.log.error(error);

    // Handle duplicate key errors
    if (error.code === 11000 || error.code === 11001) {
      return reply.code(409).send({
        error: 'User with this email already exists',
      });
    }

    // Handle validation errors
    if (error.name === 'ValidationError') {
      return reply.code(400).send({
        error: 'Validation error',
        details: error.message,
      });
    }

    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}

/**
 * Delete a user
 */
export async function deleteUser(request, reply) {
  try {
    const owner = await User.findById(request.user.userId);

    if (!owner || owner.role !== 'owner') {
      return reply.code(403).send({
        error: 'Only owners can delete users',
      });
    }

    if (!owner.companyId) {
      return reply.code(400).send({
        error: 'Owner must be associated with a company',
      });
    }

    const { id } = request.params;

    // Find user and ensure they belong to the same company
    const user = await User.findOne({
      _id: id,
      companyId: owner.companyId,
    });

    if (!user) {
      return reply.code(404).send({
        error: 'User not found',
      });
    }

    // Prevent owner from deleting themselves
    if (user._id.toString() === owner._id.toString()) {
      return reply.code(400).send({
        error: 'Cannot delete your own account',
      });
    }

    // Prevent deleting the owner account
    if (user.role === 'owner') {
      return reply.code(400).send({
        error: 'Cannot delete owner account',
      });
    }

    await User.findByIdAndDelete(id);

    return reply.send({
      message: 'User deleted successfully',
    });
  } catch (error) {
    request.log.error(error);
    return reply.code(500).send({
      error: 'Internal server error',
    });
  }
}
