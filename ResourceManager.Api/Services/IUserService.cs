using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Services;

public interface IUserService
{
    Task<PagedResult<UserResponse>> GetAllAsync(PageQuery query, CancellationToken ct = default);
    Task<UserResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<UserResponse> CreateAsync(UserRequest request, CancellationToken ct = default);
    Task<UserResponse> UpdateAsync(Guid id, UserRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
