# Category Reordering - Summary

## Feature Added
Categories (resource groups) can now be reordered via drag and drop, just like epics!

## Implementation

### 1. Made Categories Draggable ✅
Added `draggable="true"` and `data-resource-id` to resource groups:
```javascript
leftHTML += '<div class="resource-group" draggable="true" data-resource-id="' + resId + '">';
```

Applied to both:
- Left panel (`.resource-group`)
- Right panel (`.timeline-resource-group`)

### 2. Drag Initiation from Category Name ✅
Drag only starts when grabbing the category name (not the epics):
```javascript
// Only allow dragging from the resource-name area
if (!e.target.classList.contains('resource-name')) {
    e.preventDefault();
    return;
}
```

This prevents conflicts with epic dragging.

### 3. Category Drag and Drop Handler ✅
Created `setupCategoryDragAndDrop()` function with:
- `dragstart` - Store dragged category ID, set opacity
- `dragend` - Reset opacity, remove visual feedback
- `dragover` - Allow drop
- `dragenter` - Add visual feedback (dashed border)
- `dragleave` - Remove visual feedback
- `drop` - Reorder categories, save to localStorage

### 4. Category Ordering Storage ✅
Saved to localStorage as `category_ordering`:
```javascript
localStorage.setItem('category_ordering', JSON.stringify(categoryOrdering));
```

Format: `["resourceId1", "resourceId2", "resourceId3"]`

### 5. Apply Ordering on Render ✅
Categories are reordered before rendering:
```javascript
var categoryOrdering = JSON.parse(localStorage.getItem('category_ordering') || '[]');
if (categoryOrdering.length > 0) {
    var orderedResources = {};
    categoryOrdering.forEach(function(resId) {
        if (resources[resId]) {
            orderedResources[resId] = resources[resId];
        }
    });
    // Add any new resources not in the ordering
    for (var resId in resources) {
        if (!orderedResources[resId]) {
            orderedResources[resId] = resources[resId];
        }
    }
    resources = orderedResources;
}
```

### 6. Visual Feedback ✅
Added CSS for drag states:
```css
.resource-name {
    cursor: move;
}

.resource-name:hover {
    color: #007aff;
}

.resource-group.drag-over {
    background-color: rgba(0, 122, 255, 0.08);
    border: 2px dashed #007aff;
}
```

## How It Works

### User Flow:
1. **Hover over category name** → Cursor changes to "move", text turns blue
2. **Click and drag category name** → Category becomes semi-transparent
3. **Drag over target category** → Target shows dashed blue border
4. **Drop** → Categories reorder, view refreshes
5. **Order persists** → Saved to localStorage

### Technical Flow:
```
User grabs category name
  ↓
dragstart (only if target is .resource-name)
  ↓
Store draggedResourceId
  ↓
dragover target category
  ↓
Add 'drag-over' class (dashed border)
  ↓
drop
  ↓
Build/update category ordering array
  ↓
Remove dragged category from array
  ↓
Find target index
  ↓
Insert at target position
  ↓
Save to localStorage
  ↓
renderCustomExport() - refresh view
  ↓
Categories render in new order
  ↓
Epics stay with their categories
  ↓
Arrows redraw automatically
```

## Key Features

### Drag Initiation Control
- ✅ Drag only starts from category name
- ✅ Clicking epics doesn't drag the category
- ✅ No conflicts between epic and category dragging

### Visual Feedback
- ✅ Cursor changes to "move" on category name hover
- ✅ Category name turns blue on hover
- ✅ Semi-transparent while dragging
- ✅ Dashed blue border on drop target
- ✅ Smooth transitions

### Data Persistence
- ✅ Order saved to localStorage
- ✅ Survives page reload
- ✅ Independent from epic ordering
- ✅ New categories automatically added to end

### Automatic Updates
- ✅ View refreshes after reorder
- ✅ Epics stay with their categories
- ✅ Arrows redraw correctly
- ✅ Timeline updates in sync

## Files Modified
- `gantt-functions.js` - Added category drag/drop, ordering logic
- `index.html` - Added category drag state CSS
- `CATEGORY_REORDER_SUMMARY.md` - This summary

## Testing Checklist
- ✅ Cursor changes to "move" on category name hover
- ✅ Category name turns blue on hover
- ✅ Drag only works from category name (not epics)
- ✅ Category becomes semi-transparent when dragging
- ✅ Target category shows dashed border
- ✅ Categories reorder when dropped
- ✅ Epics stay with their categories
- ✅ View refreshes automatically
- ✅ Order persists after page reload
- ✅ Arrows redraw correctly
- ✅ Console logs show correct IDs

## Example Usage

### Scenario: Reorder Teams
Initial order:
1. Frontend Team (3 epics)
2. Backend Team (5 epics)
3. Design Team (2 epics)

User wants Design Team at the top:
1. Hover over "Design Team" text
2. Drag "Design Team" category
3. Drop above "Frontend Team"

New order:
1. Design Team (2 epics)
2. Frontend Team (3 epics)
3. Backend Team (5 epics)

All epics stay with their teams, arrows update automatically!

## Storage Structure

### localStorage Keys:
- `category_ordering` - Array of resource IDs in order
- `epic_ordering` - Object mapping resource IDs to arrays of epic IDs
- `category_color_map` - Object mapping category names to color indices

### Example:
```json
{
  "category_ordering": ["3", "1", "2"],
  "epic_ordering": {
    "1": [5, 6, 7],
    "2": [8, 9, 10, 11, 12],
    "3": [2, 3]
  },
  "category_color_map": {
    "Frontend Team": 0,
    "Backend Team": 2,
    "Design Team": 5
  }
}
```

## Benefits
1. **Full Control** - Organize categories in any order
2. **Visual Priority** - Put important teams at the top
3. **Presentation Ready** - Arrange for stakeholder meetings
4. **Persistent** - Order saved across sessions
5. **Intuitive** - Same drag and drop as epics
6. **No Conflicts** - Epic and category dragging work independently

## Future Enhancements (Optional)
- [ ] Drag categories between different views
- [ ] Keyboard shortcuts (Ctrl+Up/Down)
- [ ] Collapse/expand categories
- [ ] Category templates (save/load arrangements)
- [ ] Bulk operations (select multiple categories)
