# Roadmap Dashboard - User Guide

## Getting Started

### 1. Load Your Issues
1. Navigate to the **Issues** page
2. Click the **Load CSV** button to import your JIRA issues
3. Your issues will appear in the table

### 2. Map Issues to Categories

#### Automatic Mapping (Automagic)
1. Go to the **Automagic** tab
2. The system will attempt to automatically categorize your issues based on predefined rules

#### Keyword Mapping
To map issues by keyword:
- Use the pattern `.*keyword.*` to match any issue containing that keyword
- Example: To categorize all issues with "demo" as "Feature", use: `.*demo.*`
- The `.*` means "match anything before and after"

#### Manual Category Assignment
1. Click on the **Category** dropdown for any issue
2. **Creating new categories**: Simply type a new category name and press Enter - Select2 will create it automatically
3. The same applies to **Assignee** - type a new name to create it

**Important**: All issues must have the following fields set for the Gantt chart to work correctly:
- ✅ Category
- ✅ Start Date
- ✅ End Date
- ✅ Assignee

### 3. Filter Issues
- Use the **checkboxes** on the Issues page to select which issues appear in the Gantt chart
- Only checked issues will be displayed in the roadmap view

### 4. View the Gantt Chart
1. Navigate to the **Gantt Chart** view
2. Click **Open Custom Export** to see the roadmap visualization

### 5. Link Dependencies
To create dependencies between epics:
1. Click the **o→** (circle-arrow) button in front of any epic name
2. A modal will open showing all other epics grouped by category
3. Select the epic that must be completed **before** the current one (prerequisite)
4. Click **Save**
5. An arrow will appear showing the dependency relationship
6. When an epic has a dependency, the **o→** button will be colored in the category's color

**Note**: The arrow indicates "this epic depends on the selected epic being completed first"

### 6. Customize Colors
1. Click the **Color Customizer** button
2. Select a category from the dropdown
3. Choose a new color from the color picker
4. The roadmap will update automatically with your new color scheme

### 7. Export Your Roadmap
1. **Do NOT resize** the browser window or zoom - keep it at 100% for best results
2. Click the **Export to PNG** button
3. The roadmap will be saved as a high-quality PNG image
4. The file will be named with the current date (e.g., `roadmap-export-2025-11-24.png`)

## Tips & Best Practices

- **Complete all fields**: Ensure every issue has a category, dates, and assignee before exporting
- **Use consistent naming**: Keep category and assignee names consistent for better organization
- **Check your filters**: Remember that unchecked issues won't appear in the Gantt chart
- **Dependencies**: Use the link feature to show which epics block others
- **Export at 100% zoom**: For the best quality PNG export, keep your browser at default zoom level

## Troubleshooting

**Issue**: Gantt chart is empty
- ✅ Check that issues are selected (checkboxes checked)
- ✅ Verify all issues have categories assigned
- ✅ Ensure start and end dates are set

**Issue**: Export looks wrong
- ✅ Make sure browser zoom is at 100%
- ✅ Don't resize the window during export

**Issue**: Can't create new category
- ✅ Just type the name in the dropdown and press Enter - Select2 will create it automatically
