'use client';

import { useMemo } from 'react';
import { useAuth } from './auth';
import { useProjectMembers } from './hooks';
import type { ProjectPermissions, UserRole, AccessLevel } from './types';

/**
 * Resolves permissions for the current user in a given project.
 *
 * Priority:
 * 1. Project owner (designer who created the project) → full access
 * 2. project_members.access_level overrides where present
 * 3. Fallback: role-based defaults from the profile
 */
export function usePermissions(projectId: string | null): {
  permissions: ProjectPermissions;
  loading: boolean;
} {
  const { profile } = useAuth();
  const { data: members, loading } = useProjectMembers(projectId);

  const permissions = useMemo(() => {
    // Default: deny everything
    const deny: ProjectPermissions = {
      canViewDesign: false,
      canViewSupervision: false,
      canViewOverview: false,
      canViewJournal: false,
      canViewVisits: false,
      canViewSupply: false,
      canViewDocs: false,
      canViewSettings: false,
      canCreateProject: false,
      canCreateVisit: false,
      canCreateInvoice: false,
      canUploadPhoto: false,
      canChangePhotoStatus: false,
      canUploadDocument: false,
      canInviteMembers: false,
      canEditProjectSettings: false,
      canDeleteProject: false,
      canImportSupply: false,
      canManageTasks: false,
    };

    if (!profile) return deny;

    const role: UserRole = profile.role;

    // Find user's membership in this project
    const membership = members?.find(m => m.user_id === profile.id);
    const accessLevel: AccessLevel | null = membership?.access_level ?? null;

    return resolvePermissions(role, accessLevel);
  }, [profile, members]);

  return { permissions, loading };
}

/**
 * Pure function: role + access_level → permissions flags
 */
function resolvePermissions(role: UserRole, accessLevel: AccessLevel | null): ProjectPermissions {
  // Designer or assistant with full access → everything
  if (role === 'designer') {
    return fullAccess();
  }

  if (role === 'assistant') {
    if (!accessLevel || accessLevel === 'full') {
      return { ...fullAccess(), canDeleteProject: false };
    }
    // assistant with limited access — treat like the access level says
  }

  // Access-level based resolution (for all non-designer roles)
  if (accessLevel === 'full') {
    return { ...fullAccess(), canDeleteProject: false };
  }

  // Role-based defaults
  switch (role) {
    case 'client':
      return {
        canViewDesign: true,
        canViewSupervision: true,
        canViewOverview: true,
        canViewJournal: true,
        canViewVisits: true,
        canViewSupply: false,
        canViewDocs: true,
        canViewSettings: false,
        canCreateProject: false,
        canCreateVisit: false,
        canCreateInvoice: false,
        canUploadPhoto: false,
        canChangePhotoStatus: false,
        canUploadDocument: false,
        canInviteMembers: false,
        canEditProjectSettings: false,
        canDeleteProject: false,
        canImportSupply: false,
        canManageTasks: false,
      };

    case 'contractor':
      return {
        canViewDesign: true,
        canViewSupervision: true,
        canViewOverview: true,
        canViewJournal: false,
        canViewVisits: true,
        canViewSupply: false,
        canViewDocs: true,
        canViewSettings: false,
        canCreateProject: false,
        canCreateVisit: false,
        canCreateInvoice: false,
        canUploadPhoto: accessLevel === 'view_comment_photo',
        canChangePhotoStatus: false,
        canUploadDocument: false,
        canInviteMembers: false,
        canEditProjectSettings: false,
        canDeleteProject: false,
        canImportSupply: false,
        canManageTasks: false,
      };

    case 'supplier':
      return {
        canViewDesign: false,
        canViewSupervision: false,
        canViewOverview: false,
        canViewJournal: false,
        canViewVisits: false,
        canViewSupply: true,
        canViewDocs: false,
        canViewSettings: false,
        canCreateProject: false,
        canCreateVisit: false,
        canCreateInvoice: false,
        canUploadPhoto: false,
        canChangePhotoStatus: false,
        canUploadDocument: false,
        canInviteMembers: false,
        canEditProjectSettings: false,
        canDeleteProject: false,
        canImportSupply: accessLevel === 'view_supply',
        canManageTasks: false,
      };

    default:
      // Unknown role → view only
      return {
        canViewDesign: true,
        canViewSupervision: false,
        canViewOverview: true,
        canViewJournal: false,
        canViewVisits: false,
        canViewSupply: false,
        canViewDocs: false,
        canViewSettings: false,
        canCreateProject: false,
        canCreateVisit: false,
        canCreateInvoice: false,
        canUploadPhoto: false,
        canChangePhotoStatus: false,
        canUploadDocument: false,
        canInviteMembers: false,
        canEditProjectSettings: false,
        canDeleteProject: false,
        canImportSupply: false,
        canManageTasks: false,
      };
  }
}

function fullAccess(): ProjectPermissions {
  return {
    canViewDesign: true,
    canViewSupervision: true,
    canViewOverview: true,
    canViewJournal: true,
    canViewVisits: true,
    canViewSupply: true,
    canViewDocs: true,
    canViewSettings: true,
    canCreateProject: true,
    canCreateVisit: true,
    canCreateInvoice: true,
    canUploadPhoto: true,
    canChangePhotoStatus: true,
    canUploadDocument: true,
    canInviteMembers: true,
    canEditProjectSettings: true,
    canDeleteProject: true,
    canImportSupply: true,
    canManageTasks: true,
  };
}
