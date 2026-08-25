## Get coordinates in percentage on image

### steps

1. Open the PNG directly in a browser tab (drag the file in, or open it via file:// path).
1. Right-click → Inspect on the image.
1. In the browser's DevTools console, run:

```javascript
document.querySelector('img').addEventListener('mousemove', e => {
  const r = e.target.getBoundingClientRect();
  const x = ((e.clientX - r.left) / r.width *100).toFixed(2);
  const y = ((e.clientY - r.top) / r.height* 100).toFixed(2);
  console.log(`${x}%, ${y}%`);
});
```

Move your mouse over each AOI — console logs live percent position as you hover.
Note the values at each AOIs center.
These can be used later in Gorilla's Spreadsheet

