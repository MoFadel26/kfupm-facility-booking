using System.Security.Claims;
using Microsoft.IdentityModel.JsonWebTokens;
using ResourceManager.Api.Exceptions;

namespace ResourceManager.Api.Controllers;

public static class ClaimsPrincipalExtensions
{
    /// <summary>
    /// The acting user's KfupmId, taken from the token's <c>sub</c> claim. Inbound claim
    /// mapping is off, so the claim keeps its JWT name rather than becoming
    /// ClaimTypes.NameIdentifier. A valid token without one names nobody, which is a
    /// 403 rather than a 401: signing in again would not change it.
    /// </summary>
    public static string GetKfupmId(this ClaimsPrincipal principal)
        => principal.FindFirstValue(JwtRegisteredClaimNames.Sub)
           ?? throw new ForbiddenException("The token does not name a user.");
}
