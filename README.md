# Crono - Project Timeline

A modern, responsive project timeline application for tracking tasks, deadlines, and costs.

## Project Structure

```
crono/
├── index.html              # Main HTML file
├── assets/                 # Asset directory
│   ├── css/
│   │   └── styles.css     # All CSS styles
│   └── js/
│       └── app.js         # All JavaScript functionality
└── README.md              # This file
```

## Features

- **Real-time countdown timers** for task deadlines
- **Cost tracking** with invoice generation
- **Calendar integration** for deadline reminders
- **Responsive design** that works on all devices
- **Data filtering** by search terms and status
- **Summary dashboard** with key metrics
- **Dark theme** with modern UI design

## File Organization

### Modular Structure

The project has been modularized for better maintainability:

- **`index.html`** - Clean HTML structure with semantic markup
- **`assets/css/styles.css`** - All CSS styles including:
  - CSS custom properties (variables)
  - Component styles (cards, buttons, modals)
  - Responsive breakpoints
  - Animations and transitions
- **`assets/js/app.js`** - All JavaScript functionality including:
  - Configuration constants
  - Data loading and parsing
  - UI rendering and updates
  - Event handling
  - Timer functionality

### Benefits of Modular Structure

1. **Separation of Concerns** - HTML, CSS, and JavaScript are properly separated
2. **Maintainability** - Easier to find and modify specific functionality
3. **Reusability** - CSS and JS can be easily reused in other projects
4. **Performance** - External files can be cached by browsers
5. **Collaboration** - Different team members can work on different files
6. **Debugging** - Easier to debug specific issues in isolated files

## Usage

1. Open `index.html` in a web browser
2. The application will automatically load data from the configured CSV source
3. Use the search and filter controls to find specific tasks
4. Click calendar icons to add deadlines to your calendar
5. Click invoice icons to request invoices with automatic discounts

## Configuration

Key configuration options can be found in `assets/js/app.js`:

- `CSV_URL` - Data source URL
- `REFRESH_SEC` - Auto-refresh interval
- `TIMEZONE` - Display timezone
- `DISCOUNT_PERCENT` - Invoice discount percentage

## Browser Support

- Modern browsers with ES6+ support
- CSS Grid and Flexbox support required
- Fetch API support required for data loading
