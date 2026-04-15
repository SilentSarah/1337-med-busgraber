import json
import os
import time
from datetime import datetime
from dataclasses import dataclass
from pathlib import Path

import requests
import questionary
from dotenv import load_dotenv
from rich.console import Console
from rich.prompt import Prompt, IntPrompt, FloatPrompt, Confirm
from rich.table import Table
from rich.panel import Panel
from rich.live import Live
from rich.text import Text

load_dotenv()

BASE_URL = "https://bus-med.1337.ma/api"
API_URL = f"{BASE_URL}/departure/current"
TOKEN = os.getenv("LE_TOKEN")
LOGIN = os.getenv("LOGIN")

ROUTES = {
    "1": {"name": "Martil", "id": None},
    "2": {"name": "Tetouan", "id": None},
    "3": {"name": "Mdiq", "id": None},
}

BUSES = {
    "1": {"name": "BUS 01", "id": 1},
    "2": {"name": "BUS 02", "id": 2},
    "3": {"name": "BUS 03", "id": 3},
}

console = Console()

SCRIPT_DIR = Path(__file__).parent
SCHEDULE_FILE = SCRIPT_DIR / "schedule.json"

VALID_ROUTES = {"martil", "tetouan", "mdiq"}
VALID_BUSES = {"bus 01", "bus 02", "bus 03"}
VALID_DIRECTIONS = {"home", "campus"}


@dataclass
class ScheduledBooking:
    route: str
    bus: str
    hour: int
    to_campus: bool
    booked: bool = False
    ticket_hash: str = ""
    error: str = ""


def get_cookies() -> dict:
    if not TOKEN:
        raise ValueError("LE_TOKEN not found in .env file")
    return {"le_token": TOKEN}


def load_schedule() -> list[ScheduledBooking] | None:
    if not SCHEDULE_FILE.exists():
        return None

    try:
        data = json.loads(SCHEDULE_FILE.read_text())
    except (json.JSONDecodeError, OSError) as e:
        console.print(f"[red]❌ Failed to parse {SCHEDULE_FILE.name}: {e}[/red]")
        return None

    if not isinstance(data, list) or not data:
        console.print(f"[red]❌ {SCHEDULE_FILE.name} must be a non-empty JSON array.[/red]")
        return None

    bookings: list[ScheduledBooking] = []
    for idx, entry in enumerate(data, 1):
        route = entry.get("route", "")
        bus = entry.get("bus", "")
        hour = entry.get("hour")
        direction = entry.get("direction", "home")

        errors = []
        if not route or route.lower().split(" + ")[0].split("+")[0].strip().lower() not in VALID_ROUTES:
            errors.append(f"invalid route '{route}'")
        if not bus or bus.lower() not in VALID_BUSES:
            errors.append(f"invalid bus '{bus}'")
        if hour is None or not isinstance(hour, int) or hour < 0 or hour > 23:
            errors.append(f"invalid hour '{hour}'")
        if direction not in VALID_DIRECTIONS:
            errors.append(f"invalid direction '{direction}'")

        if errors:
            console.print(f"[red]❌ Entry #{idx}: {', '.join(errors)}[/red]")
            return None

        bookings.append(ScheduledBooking(
            route=route,
            bus=bus,
            hour=hour,
            to_campus=direction == "campus",
        ))

    return bookings


def check_auth() -> dict | None:
    try:
        response = requests.get(f"{BASE_URL}/auth/isAuth", cookies=get_cookies(), timeout=10)
        response.raise_for_status()
        return response.json()
    except requests.exceptions.HTTPError as e:
        if e.response is not None and e.response.status_code == 401:
            return None
        raise
    except requests.exceptions.RequestException:
        raise


def get_current_user() -> dict | None:
    user_data = check_auth()
    return user_data.get("user") if user_data else None


def fetch_departure_tickets(departure_id: int) -> list[dict]:
    response = requests.get(f"{BASE_URL}/tickets/booked/departure/{departure_id}", cookies=get_cookies(), timeout=10)
    response.raise_for_status()
    return response.json()


def fetch_departures() -> list[dict]:
    response = requests.get(API_URL, cookies=get_cookies(), timeout=10)
    response.raise_for_status()
    return response.json()


def fetch_upcoming_departures() -> list[dict]:
    response = requests.get(f"{BASE_URL}/departure/upcoming", cookies=get_cookies(), timeout=10)
    response.raise_for_status()
    return response.json()


def format_departure_time(iso_time: str) -> str:
    dt = datetime.fromisoformat(iso_time.replace("Z", "+00:00"))
    local_dt = dt.astimezone()
    return local_dt.strftime("%H:%M")


def get_availability_status(locked: bool, capacity: int, booked: int) -> str:
    if locked:
        return "[red]Locked[/red]"
    available = capacity - booked
    if available == 0:
        return "[red]Full[/red]"
    elif available <= 5:
        return f"[yellow]{available} left[/yellow]"
    return f"[green]{available} left[/green]"


def display_departures(departures: list[dict]) -> None:
    if not departures:
        console.print("[yellow]No departures available at this time.[/yellow]")
        return

    table = Table(title="🚌 Current Bus Departures", show_header=True, header_style="bold magenta")

    table.add_column("#", style="dim", justify="right")
    table.add_column("Route", style="cyan", no_wrap=True)
    table.add_column("Bus", style="blue")
    table.add_column("Departure", justify="center")
    table.add_column("To Home", justify="center")
    table.add_column("To Campus", justify="center")
    table.add_column("Capacity", justify="center")
    table.add_column("Availability", justify="center")

    for idx, departure in enumerate(departures, 1):
        route = departure.get("route", {})
        bus = route.get("bus", {})

        route_name = route.get("name", "Unknown")
        bus_name = bus.get("name", "Unknown")
        departure_time = format_departure_time(departure.get("departure_time", ""))
        to_home = str(departure.get("nbr_to_home", 0))
        to_campus = str(departure.get("nbr_to_campus", 0))
        capacity = bus.get("capacity", 0)
        booked = len(departure.get("tickets", []))
        locked = departure.get("locked", False)

        availability = get_availability_status(locked, capacity, booked)

        table.add_row(
            str(idx),
            route_name,
            bus_name,
            departure_time,
            to_home,
            to_campus,
            str(capacity),
            availability,
        )

    console.print()
    console.print(table)
    console.print()


def display_upcoming_departures(departures: list[dict]) -> None:
    if not departures:
        console.print("[yellow]No upcoming departures available.[/yellow]")
        return

    current_hour = datetime.now().hour
    current_minute = datetime.now().minute

    table = Table(title="📅 All Upcoming Departures", show_header=True, header_style="bold magenta")

    table.add_column("#", style="dim", justify="right")
    table.add_column("Route", style="cyan", no_wrap=True)
    table.add_column("Bus", style="blue")
    table.add_column("Departs", justify="center")
    table.add_column("Booking Opens", justify="center")
    table.add_column("Status", justify="center")
    table.add_column("Notes", justify="left")

    sorted_deps = sorted(departures, key=lambda x: x.get("departure_time", ""))

    for idx, dep in enumerate(sorted_deps, 1):
        route_name = dep.get("name", "Unknown")
        bus = dep.get("bus", {})
        bus_name = bus.get("name", "Unknown")
        departure_time = dep.get("departure_time", "??:??")[:5]
        available_time = dep.get("available_time", "??:??")[:5]
        no_return = dep.get("no_return", False)

        available_hour = int(available_time.split(":")[0]) if ":" in available_time else 0
        available_min = int(available_time.split(":")[1]) if ":" in available_time else 0
        
        if current_hour > available_hour or (current_hour == available_hour and current_minute >= available_min):
            status = "[green]🟢 Open[/green]"
        else:
            status = "[yellow]🟡 Not yet[/yellow]"

        notes = []
        if no_return:
            notes.append("[red]No return[/red]")
        
        notes_str = ", ".join(notes) if notes else ""

        table.add_row(
            str(idx),
            route_name,
            bus_name,
            departure_time,
            available_time,
            status,
            notes_str,
        )

    console.print()
    console.print(table)
    console.print()
    console.print("[dim]🟢 Open = Booking available now | 🟡 Not yet = Wait until 'Booking Opens' time[/dim]")
    console.print()


def find_departure(departures: list[dict], route_name: str, bus_name: str, hour: int) -> dict | None:
    for departure in departures:
        route = departure.get("route", {})
        bus = route.get("bus", {})
        dep_time = datetime.fromisoformat(departure.get("departure_time", "").replace("Z", "+00:00"))
        local_hour = dep_time.astimezone().hour

        if (route_name.lower() in route.get("name", "").lower() and
            bus_name.lower() in bus.get("name", "").lower() and
            local_hour == hour):
            return departure
    return None


def book_ticket(departure_id: int, to_campus: bool = False) -> dict:
    url = f"{BASE_URL}/tickets/book"
    payload = {
        "departure_id": departure_id,
        "to_campus": to_campus,
    }
    response = requests.post(url, json=payload, cookies=get_cookies(), timeout=10)
    response.raise_for_status()
    return response.json()


def fetch_my_tickets() -> list[dict]:
    if not LOGIN:
        console.print("[red]❌ LOGIN not set in .env file[/red]")
        return []
    
    my_tickets = []
    
    try:
        departures = fetch_departures()
        for departure in departures:
            departure_id = departure.get("id")
            try:
                tickets = fetch_departure_tickets(departure_id)
                for ticket in tickets:
                    if ticket.get("user", {}).get("login", "").lower() == LOGIN.lower():
                        ticket["departure"] = departure
                        my_tickets.append(ticket)
            except requests.exceptions.RequestException:
                continue
    except requests.exceptions.RequestException:
        pass
    
    return my_tickets


def cancel_ticket(ticket_id: int) -> dict:
    url = f"{BASE_URL}/tickets/{ticket_id}/cancel"
    response = requests.patch(url, cookies=get_cookies(), timeout=10)
    response.raise_for_status()
    return response.json()


def select_departure_interactive() -> tuple[str, str, int, bool] | None:
    console.print("\n[bold blue]Loading all departures...[/bold blue]")
    
    all_entries = []
    seen_keys = set()
    
    try:
        current_deps = fetch_departures()
        for dep in current_deps:
            route = dep.get("route", {})
            bus = route.get("bus", {})
            route_name = route.get("name", "Unknown")
            bus_name = bus.get("name", "Unknown")
            dep_time_raw = dep.get("departure_time", "")
            dep_time = format_departure_time(dep_time_raw)
            dep_hour = int(dep_time.split(":")[0]) if ":" in dep_time else 0
            
            capacity = bus.get("capacity", 0)
            booked = len(dep.get("tickets", []))
            locked = dep.get("locked", False)
            available = capacity - booked
            
            if locked:
                status = "🔒 Locked"
            elif available <= 0:
                status = "🚫 Full"
            else:
                status = f"🟢 {available} left"
            
            key = f"{route_name}|{bus_name}|{dep_hour}"
            seen_keys.add(key)
            all_entries.append({
                "time": dep_time,
                "hour": dep_hour,
                "route": route_name,
                "bus": bus_name,
                "status": status,
                "notes": "",
                "sort_key": dep_time,
            })
    except requests.exceptions.RequestException:
        pass
    
    try:
        upcoming_deps = fetch_upcoming_departures()
        current_time = datetime.now()
        
        for dep in upcoming_deps:
            route_name = dep.get("name", "Unknown")
            bus = dep.get("bus", {})
            bus_name = bus.get("name", "Unknown")
            departure_time = dep.get("departure_time", "")[:5]
            available_time = dep.get("available_time", "")[:5]
            no_return = dep.get("no_return", False)
            dep_hour = int(departure_time.split(":")[0]) if ":" in departure_time else 0
            
            key = f"{route_name}|{bus_name}|{dep_hour}"
            if key in seen_keys:
                continue
            seen_keys.add(key)
            
            avail_hour = int(available_time.split(":")[0]) if ":" in available_time else 0
            avail_min = int(available_time.split(":")[1]) if ":" in available_time else 0
            
            if current_time.hour > avail_hour or (current_time.hour == avail_hour and current_time.minute >= avail_min):
                status = "🟢 Open"
            else:
                status = "🟡 Wait"
            
            notes = " (No Return)" if no_return else ""
            
            all_entries.append({
                "time": departure_time,
                "hour": dep_hour,
                "route": route_name,
                "bus": bus_name,
                "status": status,
                "notes": notes,
                "sort_key": departure_time,
            })
    except requests.exceptions.RequestException:
        pass
    
    if not all_entries:
        console.print("[yellow]No departures available.[/yellow]")
        return None
    
    all_entries.sort(key=lambda x: x["sort_key"])
    
    choices = []
    departure_map = {}
    
    for entry in all_entries:
        choice_text = f"{entry['time']} | {entry['route']:20} | {entry['bus']:6} | {entry['status']}{entry['notes']}"
        choices.append(choice_text)
        departure_map[choice_text] = entry
    
    console.print()
    selected = questionary.select(
        "Select a departure (use arrow keys):",
        choices=choices,
        qmark="🚌",
        pointer="➤"
    ).ask()
    
    if not selected:
        return None
    
    dep_info = departure_map[selected]
    
    console.print()
    direction = questionary.select(
        "Select direction:",
        choices=["To Home", "To Campus"],
        qmark="📍"
    ).ask()
    
    if not direction:
        return None
    
    return (
        dep_info["route"],
        dep_info["bus"],
        dep_info["hour"],
        direction == "To Campus"
    )


def get_booking_preferences() -> tuple[str, str, int, bool, float]:
    console.print(Panel("[bold cyan]🎫 Booking Preferences[/bold cyan]", expand=False))
    console.print()

    console.print("[bold]Available Routes:[/bold]")
    for key, route in ROUTES.items():
        console.print(f"  [cyan]{key}[/cyan]. {route['name']}")
    console.print()

    route_choice = Prompt.ask(
        "Select route",
        choices=list(ROUTES.keys()),
        default="1"
    )
    selected_route = ROUTES[route_choice]["name"]

    console.print()
    console.print("[bold]Available Buses:[/bold]")
    for key, bus in BUSES.items():
        console.print(f"  [blue]{key}[/blue]. {bus['name']}")
    console.print()

    bus_choice = Prompt.ask(
        "Select bus",
        choices=list(BUSES.keys()),
        default="1"
    )
    selected_bus = BUSES[bus_choice]["name"]

    console.print()
    hour = IntPrompt.ask(
        "Enter departure hour (24h format, e.g., 19 for 7PM)",
        default=19
    )

    console.print()
    direction = Prompt.ask(
        "Direction",
        choices=["home", "campus"],
        default="home"
    )
    to_campus = direction == "campus"

    console.print()
    interval = FloatPrompt.ask(
        "Polling interval in seconds",
        default=1.0
    )

    return selected_route, selected_bus, hour, to_campus, interval


def get_single_booking_config() -> ScheduledBooking | None:
    result = select_departure_interactive()
    if not result:
        return None
    
    route, bus, hour, to_campus = result
    return ScheduledBooking(
        route=route,
        bus=bus,
        hour=hour,
        to_campus=to_campus
    )


def display_scheduled_bookings(bookings: list[ScheduledBooking]) -> None:
    if not bookings:
        console.print("[yellow]No bookings scheduled.[/yellow]")
        return

    table = Table(title="📋 Scheduled Bookings", show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim", justify="right")
    table.add_column("Route", style="cyan")
    table.add_column("Bus", style="blue")
    table.add_column("Hour", justify="center")
    table.add_column("Direction", justify="center")
    table.add_column("Status", justify="center")

    for idx, booking in enumerate(bookings, 1):
        if booking.booked:
            status = f"[green]✅ Booked ({booking.ticket_hash})[/green]"
        elif booking.error:
            status = f"[red]❌ {booking.error}[/red]"
        else:
            status = "[yellow]⏳ Pending[/yellow]"

        table.add_row(
            str(idx),
            booking.route,
            booking.bus,
            f"{booking.hour}:00",
            "To Campus" if booking.to_campus else "To Home",
            status
        )

    console.print()
    console.print(table)
    console.print()


def run_scheduled_bookings(bookings: list[ScheduledBooking], interval: float) -> None:
    console.print()
    console.print(Panel(
        f"[bold]Scheduled Booking Mode[/bold]\n\n"
        f"Total bookings: [cyan]{len(bookings)}[/cyan]\n"
        f"Polling Interval: [magenta]{interval}s[/magenta]\n\n"
        f"[dim]Press Ctrl+C to stop[/dim]",
        title="📅 Scheduler Active",
        expand=False
    ))
    console.print()

    attempt = 0
    start_time = time.time()

    try:
        with Live(console=console, refresh_per_second=4) as live:
            while True:
                pending = [b for b in bookings if not b.booked and not b.error]
                if not pending:
                    live.stop()
                    console.print("\n[bold green]✅ All bookings completed or errored![/bold green]")
                    display_scheduled_bookings(bookings)
                    return

                attempt += 1
                elapsed = time.time() - start_time
                current_hour = datetime.now().hour

                booked_count = sum(1 for b in bookings if b.booked)
                error_count = sum(1 for b in bookings if b.error)
                pending_count = len(pending)

                status_lines = []
                status_lines.append(f"🔄 Attempt #{attempt} | Elapsed: {elapsed:.1f}s | Current Hour: {current_hour}:00")
                status_lines.append(f"📊 Booked: [green]{booked_count}[/green] | Pending: [yellow]{pending_count}[/yellow] | Errors: [red]{error_count}[/red]")
                status_lines.append("")

                try:
                    departures = fetch_departures()
                    
                    available_hours = set()
                    for dep in departures:
                        dep_time = datetime.fromisoformat(dep.get("departure_time", "").replace("Z", "+00:00"))
                        available_hours.add(dep_time.astimezone().hour)
                    hours_str = ", ".join(f"{h}:00" for h in sorted(available_hours)) if available_hours else "none"
                    
                    status_lines.append(f"🕐 API has departures for: {hours_str}")

                    for booking in pending:
                        departure = find_departure(departures, booking.route, booking.bus, booking.hour)

                        if not departure:
                            status_lines.append(f"⏳ {booking.route} @ {booking.hour}:00 - Not available yet")
                            continue

                        route = departure.get("route", {})
                        bus = route.get("bus", {})
                        capacity = bus.get("capacity", 0)
                        booked_tickets = len(departure.get("tickets", []))
                        locked = departure.get("locked", False)
                        available = capacity - booked_tickets

                        if locked:
                            status_lines.append(f"🔒 {booking.route} @ {booking.hour}:00 - Locked")
                            continue

                        if available <= 0:
                            status_lines.append(f"🚫 {booking.route} @ {booking.hour}:00 - Full ({booked_tickets}/{capacity})")
                            continue

                        status_lines.append(f"🎯 {booking.route} @ {booking.hour}:00 - BOOKING NOW!")

                        try:
                            result = book_ticket(departure["id"], booking.to_campus)
                            booking.booked = True
                            booking.ticket_hash = result.get("hash", "N/A")
                            status_lines[-1] = f"✅ {booking.route} @ {booking.hour}:00 - BOOKED! ({booking.ticket_hash})"
                        except requests.exceptions.HTTPError as e:
                            if e.response is not None:
                                try:
                                    error_data = e.response.json()
                                    msg = error_data.get("message", str(e))
                                    if "already booked" in msg.lower():
                                        booking.booked = True
                                        booking.ticket_hash = "Already had ticket"
                                        status_lines[-1] = f"⚠️ {booking.route} @ {booking.hour}:00 - Already booked"
                                    else:
                                        booking.error = msg[:35]
                                        status_lines[-1] = f"❌ {booking.route} @ {booking.hour}:00 - {msg[:35]}"
                                except Exception:
                                    booking.error = str(e)[:35]

                except requests.exceptions.RequestException as e:
                    status_lines.append(f"⚠️ Network error: {str(e)[:40]}")

                status_text = "\n".join(status_lines)
                live.update(Panel(status_text, title="📅 Scheduler Status", expand=False))

                time.sleep(interval)

    except KeyboardInterrupt:
        console.print("\n\n[yellow]⏹️ Scheduler stopped by user.[/yellow]")
        display_scheduled_bookings(bookings)


def show_schedule_menu() -> None:
    console.print(Panel("[bold cyan]📅 Schedule Multiple Bookings[/bold cyan]", expand=False))
    console.print()

    bookings: list[ScheduledBooking] = []

    while True:
        console.print(f"\n[bold]Adding booking #{len(bookings) + 1}[/bold]")
        console.print()

        booking = get_single_booking_config()
        if not booking:
            console.print("[yellow]Selection cancelled.[/yellow]")
            break
        
        bookings.append(booking)

        console.print()
        display_scheduled_bookings(bookings)

        add_more = Confirm.ask("Add another booking?", default=True)
        if not add_more:
            break

    if not bookings:
        console.print("[yellow]No bookings configured.[/yellow]")
        return

    console.print()
    interval = FloatPrompt.ask(
        "Polling interval in seconds",
        default=1.0
    )

    console.print()
    console.print("[bold]Final Schedule:[/bold]")
    display_scheduled_bookings(bookings)

    start_now = Confirm.ask("Start scheduler now?", default=True)
    if start_now:
        run_scheduled_bookings(bookings, interval)


def is_departure_available(departure: dict) -> bool:
    if departure.get("locked", False):
        return False
    route = departure.get("route", {})
    bus = route.get("bus", {})
    capacity = bus.get("capacity", 0)
    booked = len(departure.get("tickets", []))
    return booked < capacity


def auto_grab_ticket(route_name: str, bus_name: str, hour: int, to_campus: bool, interval: float) -> None:
    console.print()
    console.print(Panel(
        f"[bold]Auto-Grab Configuration[/bold]\n\n"
        f"Route: [cyan]{route_name}[/cyan]\n"
        f"Bus: [blue]{bus_name}[/blue]\n"
        f"Hour: [green]{hour}:00[/green]\n"
        f"Direction: [yellow]{'To Campus' if to_campus else 'To Home'}[/yellow]\n"
        f"Polling Interval: [magenta]{interval}s[/magenta]\n\n"
        f"[dim]Press Ctrl+C to cancel[/dim]",
        title="🤖 Auto-Grab Mode",
        expand=False
    ))
    console.print()

    attempt = 0
    start_time = time.time()

    try:
        with Live(console=console, refresh_per_second=4) as live:
            while True:
                attempt += 1
                elapsed = time.time() - start_time

                status_text = Text()
                status_text.append("🔄 ", style="bold")
                status_text.append(f"Attempt #{attempt}", style="cyan")
                status_text.append(" | ", style="dim")
                status_text.append(f"Elapsed: {elapsed:.1f}s", style="yellow")
                status_text.append(" | ", style="dim")
                status_text.append("Checking availability...", style="blue")

                live.update(Panel(status_text, expand=False))

                try:
                    departures = fetch_departures()
                    departure = find_departure(departures, route_name, bus_name, hour)

                    if not departure:
                        status_text = Text()
                        status_text.append("⏳ ", style="bold yellow")
                        status_text.append(f"Attempt #{attempt}", style="cyan")
                        status_text.append(" | ", style="dim")
                        status_text.append(f"Elapsed: {elapsed:.1f}s", style="yellow")
                        status_text.append(" | ", style="dim")
                        status_text.append(f"Waiting for {route_name}+{bus_name}@{hour}:00...", style="yellow")
                        live.update(Panel(status_text, expand=False))
                        time.sleep(interval)
                        continue

                    route = departure.get("route", {})
                    bus = route.get("bus", {})
                    capacity = bus.get("capacity", 0)
                    booked = len(departure.get("tickets", []))
                    locked = departure.get("locked", False)
                    available = capacity - booked

                    if locked:
                        status_text = Text()
                        status_text.append("🔒 ", style="bold red")
                        status_text.append(f"Attempt #{attempt}", style="cyan")
                        status_text.append(" | ", style="dim")
                        status_text.append(f"Elapsed: {elapsed:.1f}s", style="yellow")
                        status_text.append(" | ", style="dim")
                        status_text.append("Departure LOCKED, waiting...", style="red")
                        live.update(Panel(status_text, expand=False))
                        time.sleep(interval)
                        continue

                    if available <= 0:
                        status_text = Text()
                        status_text.append("🚫 ", style="bold red")
                        status_text.append(f"Attempt #{attempt}", style="cyan")
                        status_text.append(" | ", style="dim")
                        status_text.append(f"Elapsed: {elapsed:.1f}s", style="yellow")
                        status_text.append(" | ", style="dim")
                        status_text.append(f"FULL ({booked}/{capacity}), waiting...", style="red")
                        live.update(Panel(status_text, expand=False))
                        time.sleep(interval)
                        continue

                    status_text = Text()
                    status_text.append("🎯 ", style="bold green")
                    status_text.append(f"SPOT AVAILABLE! ({available} seats)", style="bold green")
                    status_text.append(" | ", style="dim")
                    status_text.append("Booking now...", style="green")
                    live.update(Panel(status_text, expand=False))

                    result = book_ticket(departure["id"], to_campus)

                    live.stop()
                    console.print()
                    console.print(Panel(
                        f"[bold green]✅ TICKET BOOKED SUCCESSFULLY![/bold green]\n\n"
                        f"Route: [cyan]{route.get('name')}[/cyan]\n"
                        f"Bus: [blue]{bus.get('name')}[/blue]\n"
                        f"Time: [green]{format_departure_time(departure.get('departure_time', ''))}[/green]\n"
                        f"Direction: [yellow]{'To Campus' if to_campus else 'To Home'}[/yellow]\n"
                        f"Ticket Hash: [magenta]{result.get('hash', 'N/A')}[/magenta]\n\n"
                        f"[dim]Attempts: {attempt} | Time: {elapsed:.1f}s[/dim]",
                        title="🎉 Success!",
                        expand=False,
                        border_style="green"
                    ))
                    return

                except requests.exceptions.HTTPError as e:
                    if e.response is not None and e.response.status_code == 400:
                        try:
                            error_data = e.response.json()
                            msg = error_data.get("message", "")
                            if "already booked" in msg.lower():
                                live.stop()
                                console.print()
                                console.print(f"[yellow]⚠️ You already have a ticket for this departure![/yellow]")
                                return
                        except Exception:
                            pass
                    status_text = Text()
                    status_text.append("⚠️ ", style="bold yellow")
                    status_text.append(f"Attempt #{attempt}", style="cyan")
                    status_text.append(" | ", style="dim")
                    status_text.append(f"Error: {str(e)[:50]}", style="red")
                    live.update(Panel(status_text, expand=False))

                except requests.exceptions.RequestException as e:
                    status_text = Text()
                    status_text.append("⚠️ ", style="bold yellow")
                    status_text.append(f"Attempt #{attempt}", style="cyan")
                    status_text.append(" | ", style="dim")
                    status_text.append(f"Network error, retrying...", style="yellow")
                    live.update(Panel(status_text, expand=False))

                time.sleep(interval)

    except KeyboardInterrupt:
        console.print("\n\n[yellow]⏹️ Auto-grab cancelled by user.[/yellow]")


def show_booking_menu(departures: list[dict]) -> None:
    console.print(Panel("[bold cyan]🎫 Book a Ticket[/bold cyan]", expand=False))
    console.print()

    console.print("[bold]Available Routes:[/bold]")
    for key, route in ROUTES.items():
        console.print(f"  [cyan]{key}[/cyan]. {route['name']}")
    console.print()

    route_choice = Prompt.ask(
        "Select route",
        choices=list(ROUTES.keys()),
        default="1"
    )
    selected_route = ROUTES[route_choice]["name"]

    console.print()
    console.print("[bold]Available Buses:[/bold]")
    for key, bus in BUSES.items():
        console.print(f"  [blue]{key}[/blue]. {bus['name']}")
    console.print()

    bus_choice = Prompt.ask(
        "Select bus",
        choices=list(BUSES.keys()),
        default="1"
    )
    selected_bus = BUSES[bus_choice]["name"]

    console.print()
    hour = IntPrompt.ask(
        "Enter departure hour (24h format, e.g., 19 for 7PM)",
        default=19
    )

    console.print()
    direction = Prompt.ask(
        "Direction",
        choices=["home", "campus"],
        default="home"
    )
    to_campus = direction == "campus"

    departure = find_departure(departures, selected_route, selected_bus, hour)

    if not departure:
        console.print(f"\n[red]❌ No departure found for {selected_route} on {selected_bus} at {hour}:00[/red]")
        console.print("[yellow]Available departures:[/yellow]")
        display_departures(departures)
        return

    if departure.get("locked", False):
        console.print(f"\n[red]❌ This departure is locked and cannot be booked.[/red]")
        return

    route = departure.get("route", {})
    bus = route.get("bus", {})
    capacity = bus.get("capacity", 0)
    booked = len(departure.get("tickets", []))

    if booked >= capacity:
        console.print(f"\n[red]❌ This bus is full ({booked}/{capacity} seats taken).[/red]")
        return

    console.print()
    console.print(Panel(
        f"[bold]Booking Summary[/bold]\n\n"
        f"Route: [cyan]{route.get('name')}[/cyan]\n"
        f"Bus: [blue]{bus.get('name')}[/blue]\n"
        f"Time: [green]{format_departure_time(departure.get('departure_time', ''))}[/green]\n"
        f"Direction: [yellow]{'To Campus' if to_campus else 'To Home'}[/yellow]\n"
        f"Available Seats: [green]{capacity - booked}[/green]",
        title="📋 Confirm Booking",
        expand=False
    ))

    confirm = Prompt.ask("\nConfirm booking?", choices=["y", "n"], default="y")

    if confirm == "y":
        try:
            result = book_ticket(departure["id"], to_campus)
            console.print(f"\n[bold green]✅ Ticket booked successfully![/bold green]")
            if "hash" in result:
                console.print(f"[green]Ticket Hash: {result['hash']}[/green]")
        except requests.exceptions.HTTPError as e:
            console.print(f"\n[red]❌ Booking failed: {e}[/red]")
            if e.response is not None:
                try:
                    error_data = e.response.json()
                    console.print(f"[red]Server message: {error_data.get('message', 'Unknown error')}[/red]")
                except Exception:
                    pass
    else:
        console.print("\n[yellow]Booking cancelled.[/yellow]")


def manage_tickets() -> None:
    console.print("\n[bold blue]Fetching your booked tickets...[/bold blue]")
    
    try:
        tickets = fetch_my_tickets()
    except requests.exceptions.RequestException as e:
        console.print(f"[red]❌ Failed to fetch tickets: {e}[/red]")
        return

    if not tickets:
        console.print("[yellow]You have no booked tickets.[/yellow]")
        return

    table = Table(title="🎫 Your Booked Tickets", show_header=True, header_style="bold magenta")
    table.add_column("#", style="dim", justify="right")
    table.add_column("Ticket ID", style="cyan")
    table.add_column("Route", style="green")
    table.add_column("Bus", style="blue")
    table.add_column("Time", justify="center")
    table.add_column("Direction", justify="center")
    table.add_column("Position", justify="center")

    for idx, ticket in enumerate(tickets, 1):
        departure = ticket.get("departure", {})
        route = departure.get("route", {})
        bus = route.get("bus", {})
        
        table.add_row(
            str(idx),
            str(ticket.get("id", "N/A")),
            route.get("name", "Unknown"),
            bus.get("name", "Unknown"),
            format_departure_time(departure.get("departure_time", "")),
            "To Campus" if ticket.get("to_campus", False) else "To Home",
            f"#{ticket.get('position', '?')}"
        )

    console.print()
    console.print(table)
    console.print()
    console.print(f"[bold]Total: {len(tickets)} ticket(s)[/bold]")
    console.print()

    if not Confirm.ask("[red]Cancel ALL tickets?[/red]", default=False):
        console.print("[yellow]No tickets cancelled.[/yellow]")
        return

    console.print()
    cancelled_count = 0
    failed_count = 0

    for idx, ticket in enumerate(tickets, 1):
        ticket_id = ticket.get("id")
        
        try:
            cancel_ticket(ticket_id)
            console.print(f"[green]✓ Cancelled ticket #{idx} (ID: {ticket_id})[/green]")
            cancelled_count += 1
        except requests.exceptions.RequestException as e:
            console.print(f"[red]✗ Failed to cancel ticket #{idx} (ID: {ticket_id}): {e}[/red]")
            failed_count += 1

    console.print()
    console.print(Panel(
        f"[bold]Cancellation Summary[/bold]\n\n"
        f"✅ Cancelled: {cancelled_count}\n"
        f"❌ Failed: {failed_count}",
        title="📊 Results",
        expand=False
    ))


def show_main_menu() -> str:
    console.print()
    console.print(Panel("[bold green]🚌 42 Bus Graber[/bold green]", expand=False))
    console.print()
    console.print("[bold]What would you like to do?[/bold]")
    console.print("  [cyan]1[/cyan]. View current departures")
    console.print("  [cyan]2[/cyan]. View all upcoming departures (full day)")
    console.print("  [cyan]3[/cyan]. Book a ticket")
    console.print("  [cyan]4[/cyan]. Auto-grab ticket (wait until available)")
    console.print("  [cyan]5[/cyan]. Schedule multiple bookings")
    console.print("  [cyan]6[/cyan]. Manage my tickets (cancel all)")
    console.print("  [cyan]7[/cyan]. Exit")
    console.print()

    return Prompt.ask("Select option", choices=["1", "2", "3", "4", "5", "6", "7"], default="1")


def main():
    try:
        console.print()
        console.print(Panel("[bold green]🚌 42 Bus Graber[/bold green]", expand=False))
        console.print()
        console.print("[dim]Checking authentication...[/dim]")
        
        if not check_auth():
            console.print()
            console.print(Panel(
                "[bold red]❌ Authentication Failed[/bold red]\n\n"
                "Your token is invalid or expired.\n"
                "Please update LE_TOKEN in your .env file with a fresh token from:\n"
                "[cyan]https://bus-med.1337.ma[/cyan]",
                title="⚠️ Auth Error",
                expand=False,
                border_style="red"
            ))
            return
        
        console.print("[green]✓ Authenticated successfully![/green]")
        
        scheduled_bookings = load_schedule()
        if scheduled_bookings:
            console.print()
            console.print(f"[cyan]📄 Found {SCHEDULE_FILE.name} with {len(scheduled_bookings)} booking(s)[/cyan]")
            console.print()
            display_scheduled_bookings(scheduled_bookings)
            console.print()
            
            run_scheduler = Confirm.ask(
                f"Run scheduler with these bookings?",
                default=True
            )
            
            if run_scheduler:
                interval = FloatPrompt.ask(
                    "Polling interval in seconds",
                    default=2.0
                )
                console.print()
                run_scheduled_bookings(scheduled_bookings, interval)
                return
            else:
                console.print("[dim]Continuing to main menu...[/dim]")
        
        while True:
            choice = show_main_menu()

            if choice == "1":
                console.print("\n[bold blue]Fetching current bus departures...[/bold blue]")
                departures = fetch_departures()
                display_departures(departures)

            elif choice == "2":
                console.print("\n[bold blue]Fetching all upcoming departures...[/bold blue]")
                upcoming = fetch_upcoming_departures()
                display_upcoming_departures(upcoming)

            elif choice == "3":
                console.print("\n[bold blue]Fetching available departures...[/bold blue]")
                departures = fetch_departures()
                display_departures(departures)
                show_booking_menu(departures)

            elif choice == "4":
                result = select_departure_interactive()
                if result:
                    route, bus, hour, to_campus = result
                    console.print()
                    interval = FloatPrompt.ask("Polling interval in seconds", default=1.0)
                    auto_grab_ticket(route, bus, hour, to_campus, interval)

            elif choice == "5":
                console.print("\n[bold blue]Fetching available departures...[/bold blue]")
                departures = fetch_departures()
                display_departures(departures)
                show_schedule_menu()

            elif choice == "6":
                manage_tickets()

            elif choice == "7":
                console.print("\n[cyan]Goodbye! 👋[/cyan]")
                break

    except requests.exceptions.RequestException as e:
        console.print(f"[red]Error: {e}[/red]")
    except ValueError as e:
        console.print(f"[red]Configuration error: {e}[/red]")
    except KeyboardInterrupt:
        console.print("\n\n[cyan]Goodbye! 👋[/cyan]")


if __name__ == "__main__":
    main()
