const permissionsByRole = {
  super_admin: new Set([
    "manage_users", "manage_roles", "manage_settings", "create_news",
    "edit_own_news", "edit_all_news", "review_news", "approve_news",
    "publish_news", "manage_categories", "view_analytics", "submit_news",
    "manage_ads", "moderate_comments", "delete_news",
  ]),
  admin: new Set([
    "manage_users", "assign_editor_reporter", "create_news", "edit_own_news",
    "edit_all_news", "review_news", "approve_news", "publish_news",
    "manage_categories", "view_analytics", "submit_news", "manage_ads",
    "moderate_comments", "delete_news",
  ]),
  editor: new Set([
    "create_news", "edit_own_news", "edit_all_news", "review_news",
    "approve_news", "publish_news", "manage_categories", "view_analytics",
    "submit_news", "moderate_comments",
  ]),
  reporter: new Set(["create_news", "edit_own_news", "submit_news"]),
};

function hasPermission(user, permission) {
  return Boolean(permissionsByRole[user?.role]?.has(permission));
}

function requirePermission(permission) {
  return (req, res, next) => hasPermission(req.user, permission)
    ? next()
    : res.status(403).json({ success: false, message: "Permission denied" });
}

module.exports = { hasPermission, requirePermission };
