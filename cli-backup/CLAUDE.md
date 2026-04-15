# CLAUDE.md
This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview
42 Bus Graber is a Python CLI tool for booking bus tickets at 42 School (1337.ma). It interacts with the bus-med.1337.ma API to check departures, book tickets, and manage reservations.

## Setup

### Dependencies
The project is a single-file Python script that requires:
- `requests` - HTTP requests
- `questionary` - Interactive prompts
- `rich` - Terminal UI (tables, panels, progress)
- `python-dotenv` - Environment variable loading

### Configuration
1. Create a `.env` file in the project root with:
   ```
   LE_TOKEN=<your_token_from_bus-med.1337.ma>
   LOGIN=<your_42_login>
   ```
2. Get the token by logging into https://bus-med.1337.ma and copying the `le_token` cookie value.

## Running the Application

```bash
# Run the interactive CLI
python main.py

# Main menu options:
# 1. View current departures
# 2. View all upcoming departures (full day)
# 3. Book a ticket
# 4. Auto-grab ticket (wait until available)
# 5. Schedule multiple bookings
# 6. Manage my tickets (cancel all)
# 7. Exit
```

### Scheduled Bookings (JSON Config)
Create a `schedule.json` file in the project root to auto-run bookings on startup:

```json
[
  {
    "route": "Martil",
    "bus": "BUS 01",
    "hour": 19,
    "direction": "home"
  },
  {
    "route": "Tetouan",
    "bus": "BUS 02",
    "hour": 18,
    "direction": "campus"
  }
]
```

**Validation rules:**
- `route`: Must be "Martil", "Tetouan", or "Mdiq"
- `bus`: Must be "BUS 01", "BUS 02", or "BUS 03"
- `hour`: Integer 0-23 (24-hour format)
- `direction`: "home" or "campus"

## Architecture

### Single-File Structure (`main.py`)
The entire application is contained in one file (~1100 lines):

**Configuration Constants (lines 20-44)**
- `BASE_URL` and `API_URL` - API endpoints
- `ROUTES` and `BUSES` - Valid route/bus mappings
- `SCHEDULE_FILE` - Path to schedule.json

**Data Class (lines 47-56)**
- `ScheduledBooking` - Represents a scheduled booking with validation state

**API Functions (lines 58-150)**
- `get_cookies()` - Returns auth cookies from LE_TOKEN
- `check_auth()` - Validates authentication
- `fetch_departures()` / `fetch_upcoming_departures()` - Fetch bus data
- `fetch_departure_tickets()` - Get tickets for a departure
- `book_ticket()` / `cancel_ticket()` - Booking operations

**Display Functions (lines 151-265)**
- `display_departures()` - Rich table with current departures
- `display_upcoming_departures()` - List all upcoming buses
- Uses Rich library for formatted terminal output

**Booking Logic (lines 266-700)**
- `find_departure()` - Match route/bus/hour to departure ID
- `select_departure_interactive()` - Questionary-based selection
- `auto_grab_ticket()` - Poll until available, then book
- `run_scheduled_bookings()` - Process multiple bookings with Live dashboard

**Main Entry Point (lines 1037-1132)**
- `main()` - Auth check, schedule.json loading, main menu loop

### External API
Base URL: `https://bus-med.1337.ma/api`

Key endpoints:
- `GET /auth/isAuth` - Check authentication
- `GET /departure/current` - Current departures (bookable)
- `GET /departure/upcoming` - All upcoming departures
- `GET /tickets/booked/departure/{id}` - Tickets for departure
- `POST /tickets/book` - Book a ticket
- `PATCH /tickets/{id}/cancel` - Cancel a ticket

Request authentication: `Cookie: le_token=<TOKEN>`

### Bus Data Model
```python
{
  "id": int,
  "departure_time": "ISO 8601 timestamp",
  "route": {
    "name": "Martil|Tetouan|Mdiq",
    "bus": {"name": "BUS 01|02|03", "capacity": int},
    "locked": bool
  },
  "tickets": [...],
  "nbr_to_home": int,
  "nbr_to_campus": int
}
```

## Testing
No formal test suite. Test manually by:
```bash
# Run with dry-run check (view departures)
# Test auth: option 1 in menu
# Test booking flow: option 3
# Test auto-grab: option 4 (safe to cancel with Ctrl+C)
```

## Common Development Tasks

### Add new route or bus
Edit the `ROUTES` or `BUSES` dicts at lines 25-35 and update `VALID_ROUTES`/`VALID_BUSES` at lines 42-43.

### Modify polling interval
Change the default in `FloatPrompt.ask()` calls (e.g., line 497, 689, 1107).

### Debug API issues
Add logging to `get_cookies()` and API functions. Check browser Network tab for proper token.
