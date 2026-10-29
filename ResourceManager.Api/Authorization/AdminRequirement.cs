using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;
using Microsoft.EntityFrameworkCore;
using Microsoft.IdentityModel.JsonWebTokens;
using ResourceManager.Api.Data;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Authorization;

public class AdminRequirement : IAuthorizationRequirement
{
    public const string PolicyName = "Admin";
}

/// <summary>
/// Reads the role from the Users table on every request rather than from a token claim,
/// so demoting an admin takes effect on their next request instead of when their token
/// expires. The cost is one indexed lookup per admin write.
/// </summary>
public class AdminHandler : AuthorizationHandler<AdminRequirement>
{
    private readonly AppDbContext _db;

    public AdminHandler(AppDbContext db)
    {
        _db = db;
    }

    protected override async Task HandleRequirementAsync(AuthorizationHandlerContext context, AdminRequirement requirement)
    {
        var kfupmId = context.User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        if (kfupmId is null)
            return;

        if (await _db.Users.AnyAsync(u => u.KfupmId == kfupmId && u.Role == UserRole.Admin))
            context.Succeed(requirement);
    }
}
