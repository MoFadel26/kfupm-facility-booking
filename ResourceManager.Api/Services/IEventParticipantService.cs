using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Services;

public interface IEventParticipantService
{
    Task<PagedResult<EventParticipantResponse>> GetAllAsync(EventParticipantQuery query, CancellationToken ct = default);
    Task<EventParticipantResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<EventParticipantResponse> CreateAsync(CreateEventParticipantRequest request, string actingUserId, CancellationToken ct = default);
    Task DeleteAsync(Guid id, string actingUserId, CancellationToken ct = default);
}
