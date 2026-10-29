using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using ResourceManager.Api.Authorization;
using ResourceManager.Api.DTO;
using ResourceManager.Api.Services;

namespace ResourceManager.Api.Controllers;

[ApiController]
[Route("api/facilities")]
public class FacilitiesController : ControllerBase
{
    private readonly IFacilityService _facilityService;

    public FacilitiesController(IFacilityService facilityService)
    {
        _facilityService = facilityService;
    }

    [HttpGet]
    [ProducesResponseType(typeof(PagedResult<FacilityResponse>), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    public async Task<ActionResult<PagedResult<FacilityResponse>>> GetAll([FromQuery] PageQuery query, CancellationToken ct)
        => Ok(await _facilityService.GetAllAsync(query, ct));

    [HttpGet("{id:guid}")]
    [ProducesResponseType(typeof(FacilityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    public async Task<ActionResult<FacilityResponse>> GetById(Guid id, CancellationToken ct)
        => Ok(await _facilityService.GetByIdAsync(id, ct));

    [HttpPost]
    [Authorize(Policy = AdminRequirement.PolicyName)]
    [ProducesResponseType(typeof(FacilityResponse), StatusCodes.Status201Created)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FacilityResponse>> Create(FacilityRequest request, CancellationToken ct)
    {
        var facility = await _facilityService.CreateAsync(request, ct);
        return CreatedAtAction(nameof(GetById), new { id = facility.Id }, facility);
    }

    [HttpPut("{id:guid}")]
    [Authorize(Policy = AdminRequirement.PolicyName)]
    [ProducesResponseType(typeof(FacilityResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(typeof(ValidationProblemDetails), StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<ActionResult<FacilityResponse>> Update(Guid id, FacilityRequest request, CancellationToken ct)
        => Ok(await _facilityService.UpdateAsync(id, request, ct));

    [HttpDelete("{id:guid}")]
    [Authorize(Policy = AdminRequirement.PolicyName)]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status401Unauthorized)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status404NotFound)]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Delete(Guid id, CancellationToken ct)
    {
        await _facilityService.DeleteAsync(id, ct);
        return NoContent();
    }
}
