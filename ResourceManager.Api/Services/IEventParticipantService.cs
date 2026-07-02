using ResourceManager.Api.DTO;

namespace ResourceManager.Api.Services;

public interface IEventParticipantService
{
    Task<List<EventParticipantResponse>> GetAllAsync(CancellationToken ct = default);
    Task<EventParticipantResponse> GetByIdAsync(Guid id, CancellationToken ct = default);
    Task<List<EventParticipantResponse>> GetByReservationIdAsync(Guid reservationId, CancellationToken ct = default);
    Task<List<EventParticipantResponse>> GetByUserIdAsync(Guid userId, CancellationToken ct = default);
    Task<EventParticipantResponse> CreateAsync(CreateEventParticipantRequest request, CancellationToken ct = default);
    Task DeleteAsync(Guid id, CancellationToken ct = default);
}
