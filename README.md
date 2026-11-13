# Victor’s Workshop

A static 3D tour of Victor Frankenstein’s workshop. The site code and all browser assets are in `dist/`.

## Deploy on Vercel

1. Extract the ZIP. Upload the extracted files and the entire `dist/` folder to your GitHub repository. Keep `vercel.json` next to `dist/` at the repository root.
2. In Vercel, choose **Add New → Project** and import the repository.
3. Leave **Root Directory** at the repository root. The included configuration serves `dist/` as a static site without a build or dependency installation. Click **Deploy**.

## Preview locally

From the repository root, run `python3 -m http.server 8000 --directory dist` and open <http://localhost:8000>. The site uses JavaScript modules, so open it through the local server.

Start in **Overhead**. Drag to pan or scroll to zoom. Select **01–07** to visit a stop, and open **Map key** to read the textual evidence for each stop.
