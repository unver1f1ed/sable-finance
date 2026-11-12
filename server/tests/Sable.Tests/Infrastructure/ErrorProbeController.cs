using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Sable.Application.Common;

namespace Sable.Tests.Infrastructure;

[ApiController]
[Route("test-errors")]
public class ErrorProbeController : ControllerBase
{
    [HttpGet("unexpected")]
    public IActionResult Unexpected() => throw new InvalidOperationException("sensitive internal detail");

    [HttpGet("conflict")]
    public IActionResult ThrowConflict() => throw Errors.Conflict("Запис уже існує");

    [HttpGet("admin-only")]
    [Authorize(Roles = "Admin")]
    public IActionResult AdminOnly() => Ok();

    [HttpPost("validate")]
    public IActionResult Validate(ProbeInput input) => Ok(input);

    public class ProbeInput
    {
        [Required]
        public string? UserName { get; set; }

        [Range(1, 10)]
        public int Count { get; set; }
    }
}
