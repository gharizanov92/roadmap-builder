# Changes Summary - Category Mapping Improvements

## Completed Changes

### 1. User Guide Created ✅
- Created `USER_GUIDE.md` with comprehensive instructions
- Covers CSV loading, category mapping, keyword patterns, dependencies, and export
- Explains Select2 behavior for creating new categories/assignees
- Emphasizes importance of setting all fields (category, dates, assignee)
- Explains dependency linking with the o→ button
- Includes troubleshooting section

### 2. Epic Reordering Fixed ✅
**Problem**: Epics couldn't be reordered in the data grid

**Solution**:
- Made all data grid rows draggable (`draggable="true"`)
- Added drag and drop event handlers:
  - `handleDataRowDragStart` - Initiates drag
  - `handleDataRowDragOver` - Handles drag over with category restriction
  - `handleDataRowDrop` - Handles drop
  - `handleDataRowDragEnd` - Reorders array and saves
- **Category restriction**: Epics can only be reordered within their own category
- After reordering, the `mappedJiras` array is updated and saved
- `renderDataGrid()` is called to refresh the view
- Added CSS for drag cursor states

**Note**: Arrows are not redrawn because category_mapping.html uses an iframe for the Gantt chart. The arrow redrawing will be handled in index.html which has the custom export view.

### 3. Color Customizer Added ✅
**Features**:
- New "Color Customizer" button in the header with palette icon
- Modal dialog for selecting category and choosing color
- Dropdown populated with all existing categories
- HTML5 color picker for easy color selection
- Colors saved to localStorage as `category_color_map`
- After saving, grid is re-rendered to apply new colors

**Usage**:
1. Click "Color Customizer" button
2. Select a category from dropdown
3. Choose a color from the color picker
4. Click "Save"
5. The category's color is updated throughout the app

### 4. Percentages in Pills
**Status**: Not applicable to category_mapping.html
- category_mapping.html uses an iframe loading dhtmlx_gantt.html
- The custom export view with pills is in index.html
- This will be addressed when working on index.html next

## Files Modified
- `category_mapping.html` - Added drag/drop, color customizer, improved UX
- `USER_GUIDE.md` - Created comprehensive user documentation
- `CHANGES_SUMMARY.md` - This file

## Next Steps (for index.html)
1. Remove percentages from epic pills in custom export view
2. Ensure arrows redraw after epic reordering
3. Apply any additional improvements from category_mapping.html
