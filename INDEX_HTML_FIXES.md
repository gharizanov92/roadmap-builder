# Index.html Fixes - Summary

## Issues Fixed

### 1. Epic Reordering ✅
**Status**: Already implemented!

The drag and drop functionality for reordering epics was already present in `gantt-functions.js`:
- Epics can be dragged and dropped within their category (resource)
- Order is saved to localStorage as `epic_ordering`
- After reordering, `renderCustomExport()` is called which automatically redraws arrows
- The `setupDragAndDrop()` function handles all drag events

**How it works**:
1. User drags an epic row
2. Can only drop within the same category/resource
3. Order is updated in localStorage
4. View is re-rendered with new order
5. Arrows are automatically redrawn via `renderDependencyArrows()`

### 2. Linking Functionality Fixed ✅
**Problem**: Adding links didn't work, but removing did

**Root Cause**: Function name conflicts between two dependency modals
- Custom export modal (for gantt chart) - uses functions from `gantt-functions.js`
- Category mapping modal (for issues page) - uses functions from `index.html`
- Both modals had the same ID: `dependencyModal`
- Functions were overriding each other

**Solution**:
1. Renamed category mapping modal ID: `dependencyModal` → `categoryDependencyModal`
2. Renamed category mapping functions to avoid conflicts:
   - `closeDependencyModal()` → `closeCategoryDependencyModal()`
   - `selectDependency()` → `selectCategoryDependency()`
3. Updated all references to use the new names

**Now**:
- Custom export modal uses: `closeDependencyModal()`, `selectDependency()`, `saveDependencyLink()` from gantt-functions.js
- Category mapping modal uses: `closeCategoryDependencyModal()`, `selectCategoryDependency()` from index.html
- No more conflicts!

### 3. Percentages Removed from Pills ✅
**Change**: Removed the progress percentage display from epic pills in the timeline view

**Before**: Pills showed epic name + progress percentage (e.g., "Epic Name 75%")
**After**: Pills only show epic name

**Implementation**:
- Removed `<span class="epic-pill-progress">` from the pill HTML in gantt-functions.js
- Progress background bar still shows visually (semi-transparent overlay)
- Just the text percentage is removed for cleaner appearance

## Files Modified
- `index.html` - Fixed modal ID conflicts and renamed functions
- `gantt-functions.js` - Removed percentage text from pills
- `INDEX_HTML_FIXES.md` - This summary

## Testing Checklist
- ✅ Epic reordering works within categories
- ✅ Arrows redraw after reordering
- ✅ Adding dependency links works in custom export view
- ✅ Removing dependency links works in custom export view
- ✅ Category mapping dependency modal still works
- ✅ Pills show only epic names (no percentages)
- ✅ Progress background bar still visible

## How to Use

### Reordering Epics:
1. Open Custom Export view
2. Drag any epic row
3. Drop it in a new position within the same category
4. Arrows automatically update

### Adding Dependencies:
1. Click the o→ button next to an epic
2. Modal opens showing all other epics grouped by category
3. Click on the epic that should be completed first (prerequisite)
4. Click "Save"
5. Arrow appears showing the dependency
6. The o→ button turns the category color

### Removing Dependencies:
1. Click the o→ button on an epic that has a dependency
2. Click "Remove Link" button
3. Dependency is removed and arrow disappears
