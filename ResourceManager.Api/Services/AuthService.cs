using Microsoft.AspNetCore.Identity;
using Microsoft.EntityFrameworkCore;
using ResourceManager.Api.Data;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Exceptions;
using ResourceManager.Api.Models;
using ResourceManager.Api.Models.Enums;

namespace ResourceManager.Api.Services;

public class AuthService : IAuthService
{
    // One message for an unknown id, a wrong password and an account with no password, so
    // the response does not say which of the three it was.
    private const string LoginFailed = "The KFUPM id or password is incorrect.";

    private static readonly Lazy<string> TimingHash =
        new(() => new PasswordHasher<User>().HashPassword(null!, Guid.NewGuid().ToString()));

    private readonly AppDbContext _db;
    private readonly IPasswordHasher<User> _passwordHasher;
    private readonly TokenService _tokenService;
    private readonly IConfiguration _configuration;

    public AuthService(AppDbContext db, IPasswordHasher<User> passwordHasher, TokenService tokenService, IConfiguration configuration)
    {
        _db = db;
        _passwordHasher = passwordHasher;
        _tokenService = tokenService;
        _configuration = configuration;
    }

    public async Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default)
    {
        await UserService.EnsureUniqueAsync(_db, request.KfupmId, request.Email, excludeId: null, ct);

        // Without this, nobody could ever become an admin: only an admin can change a role.
        // The configured id gets Admin when it registers; everyone else starts as a Student.
        var kfupmId = request.KfupmId.Trim();
        var bootstrapAdmin = _configuration["Bootstrap:AdminKfupmId"];
        var role = !string.IsNullOrWhiteSpace(bootstrapAdmin) && kfupmId == bootstrapAdmin.Trim()
            ? UserRole.Admin
            : UserRole.Student;

        var user = new User(kfupmId, request.Name.Trim(), request.Email.Trim(), role, request.Gender);
        user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));
        _db.Users.Add(user);
        await _db.SaveChangesAsync(ct);
        return Respond(user);
    }

    public async Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default)
    {
        var kfupmId = request.KfupmId.Trim();
        var user = await _db.Users.FirstOrDefaultAsync(u => u.KfupmId == kfupmId, ct);
        if (user?.PasswordHash is null)
        {
            // Hash anyway, so an unknown id takes as long as a wrong password and the
            // response time does not say which ids have accounts.
            _passwordHasher.VerifyHashedPassword(null!, TimingHash.Value, request.Password);
            throw new UnauthorizedException(LoginFailed);
        }

        var result = _passwordHasher.VerifyHashedPassword(user, user.PasswordHash, request.Password);
        if (result == PasswordVerificationResult.Failed)
            throw new UnauthorizedException(LoginFailed);

        // The hash was made with older settings (fewer iterations, an older format). The
        // plain password is only in hand now, so this is the one chance to upgrade it.
        if (result == PasswordVerificationResult.SuccessRehashNeeded)
        {
            user.SetPasswordHash(_passwordHasher.HashPassword(user, request.Password));
            await _db.SaveChangesAsync(ct);
        }

        return Respond(user);
    }

    public async Task<UserResponse> GetCurrentUserAsync(string actingUserId, CancellationToken ct = default)
    {
        return await _db.Users.AsNoTracking()
            .Where(u => u.KfupmId == actingUserId)
            .Select(UserMappingExtensions.Projection)
            .FirstOrDefaultAsync(ct)
            ?? throw new ForbiddenException($"User '{actingUserId}' named by the token does not exist.");
    }

    private AuthResponse Respond(User user)
    {
        var (token, expiresAt) = _tokenService.Issue(user);
        return new AuthResponse { Token = token, ExpiresAt = expiresAt, User = user.ToResponse() };
    }
}
