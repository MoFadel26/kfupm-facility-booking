using Microsoft.IdentityModel.JsonWebTokens;
using Microsoft.IdentityModel.Tokens;
using ResourceManager.Api.Models;

namespace ResourceManager.Api.Services;

/// <summary>
/// Issues the access tokens the JWT bearer handler validates. Issuer, audience and key are
/// read from the same Authentication:Schemes:Bearer section the handler binds, so a token
/// issued here is one it accepts, with nothing to keep in sync by hand.
/// </summary>
public class TokenService
{
    private static readonly TimeSpan Lifetime = TimeSpan.FromMinutes(60);

    private readonly string _issuer;
    private readonly string _audience;
    private readonly SigningCredentials _signingCredentials;

    public TokenService(IConfiguration configuration)
    {
        var bearer = configuration.GetSection("Authentication:Schemes:Bearer");
        _issuer = bearer["ValidIssuer"] ?? throw Missing("ValidIssuer");
        _audience = bearer["ValidAudiences:0"] ?? throw Missing("ValidAudiences:0");
        var key = bearer["SigningKeys:0:Value"] ?? throw Missing("SigningKeys:0:Value");
        _signingCredentials = new SigningCredentials(
            new SymmetricSecurityKey(Convert.FromBase64String(key)), SecurityAlgorithms.HmacSha256);
    }

    /// <summary>
    /// No role claim on purpose: the role is read from the database on every request that
    /// needs it, so a claim would only be a stale copy that something might trust.
    /// </summary>
    public (string Token, DateTimeOffset ExpiresAt) Issue(User user)
    {
        var expiresAt = DateTimeOffset.UtcNow.Add(Lifetime);
        var token = new JsonWebTokenHandler().CreateToken(new SecurityTokenDescriptor
        {
            Issuer = _issuer,
            Audience = _audience,
            Claims = new Dictionary<string, object>
            {
                [JwtRegisteredClaimNames.Sub] = user.KfupmId,
                [JwtRegisteredClaimNames.Name] = user.Name
            },
            Expires = expiresAt.UtcDateTime,
            SigningCredentials = _signingCredentials
        });
        return (token, expiresAt);
    }

    private static InvalidOperationException Missing(string key)
        => new($"Authentication:Schemes:Bearer:{key} is not configured, so no token can be issued.");
}
