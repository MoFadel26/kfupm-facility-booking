using Microsoft.AspNetCore.Mvc;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Services;

namespace ResourceManager.Api.Controllers;

[ApiController]
[Route("api/eventparticipants")]
public class EventParticipantsController : ControllerBase
{
    private readonly IEventParticipantService _eventParticipantService;

    public EventParticipantsController(IEventParticipantService eventParticipantService)
    {
        _eventParticipantService = eventParticipantService;
    }

    /// <summary>Lists participants, optionally filtered by user or reservation.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<EventParticipantResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<PagedResult<EventParticipantResponse>>> GetAll([FromQuery] EventParticipantQuery query, CancellationToken ct)
        => Ok(await _eventParticipantService.GetAllAsync(query, ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(EventParticipantResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<EventParticipantResponse>> GetById(Guid id, CancellationToken ct)
        => Ok(await _eventParticipantService.GetByIdAsync(id, ct));

    [HttpPost]
    [ProducesResponseType(typeof(EventParticipantResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<EventParticipantResponse>> Create(CreateEventParticipantRequest request, CancellationToken ct)
    {
        var participant = await _eventParticipantService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = participant.Id }, participant);
    }

    [HttpDelete("{id:guid}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _eventParticipantService.DeleteAsync(id, ct);
        return NoContent();
    }
}
