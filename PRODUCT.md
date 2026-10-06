# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Both campus members (students, researchers, faculty) booking campus spaces (labs, study halls, lecture rooms, sports complexes) and facilities administrators/staff managing allocations, capacities, and access rules.

## Product Purpose
Deliver a modern, frictionless space reservation and management system for KFUPM (King Fahd University of Petroleum & Minerals). Eliminate booking conflicts, clarify facility eligibility (capacity, allowed roles, gender constraints), and streamline participant collaboration.

## Positioning
A high-performance campus space coordination hub that marries strict backend guarantees (PostgreSQL constraint-level double-booking prevention, role and gender access rules) with a first-class, modern academic digital experience fitting a world-class STEM institution.

## Operating Context
Daily university life across desktop and mobile devices: campus members booking seminar rooms, recreation spaces, or labs on the go, and facility administrators managing high-volume schedules, participant rosters, and room turnover.

## Capabilities and Constraints
- Concurrency-safe reservation engine preventing any overlapping active bookings for the same space.
- Access rules enforced at facility and participant levels: capacity limits, role constraints (Student, Faculty, Staff, Admin), and gender requirements.
- Full participant lifecycle tracking with deduplication guards.
- Status management: Pending, Confirmed, Cancelled, Completed.
- React 19 frontend with Tailwind CSS 4, Lucide icons, and modern UI primitives.

## Brand Commitments
- **Name**: KFUPM Facility Booking / Resource Manager
- **Identity**: Modern Academic Tech—prestigious, clean, architectural, and forward-looking.
- **Palette**: Signature KFUPM green accents (`#006C35` / modern emerald OKLCH tones), crisp slate backgrounds, airy cards, and refined typography.
- **Anti-Reference**: Discard the drab "institutional ledger" aesthetic (dark green walls, ruled notebook lines, heavy serif headers, and cramped data tables).

## Product Principles
1. **Clarity Over Bureaucracy**: Surface availability, limits, and schedules through clean visual cards, badges, and intuitive indicators rather than dense text dumps.
2. **Context-Rich Visual Affordances**: Rich facility cards with capacity counters, role badges, gender tags, and clear status indicators.
3. **Fluid Execution**: Seamless navigation, responsive layouts for all viewports, effortless modals, and clear error recovery.
4. **Architectural Balance**: High information density balanced with generous whitespace, crisp border tokens, and purposeful micro-interactions.
