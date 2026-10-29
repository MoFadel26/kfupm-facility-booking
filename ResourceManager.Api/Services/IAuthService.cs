using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Services;

public interface IAuthService
{
    Task<AuthResponse> RegisterAsync(RegisterRequest request, CancellationToken ct = default);
    Task<AuthResponse> LoginAsync(LoginRequest request, CancellationToken ct = default);
    Task<UserResponse> GetCurrentUserAsync(string actingUserId, CancellationToken ct = default);
}
