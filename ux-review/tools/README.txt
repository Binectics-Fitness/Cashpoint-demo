Tooling used for the UX review. Needs Google Chrome and Node 22+. No installs.

cap.mjs      screenshots:   node cap.mjs <outDir> <spec.json>          (spec: [{name,url,width,height,full,clear,steps,text}])
explore.mjs  state explorer: node explore.mjs <baseDir/> <outDir> Page1,Page2 [width] [height]
             loads each page, clicks every distinct control on a fresh load, saves a screenshot of every state
             (drawer, dialog, validation after an empty submit) plus facts in _<first>-states.json
sheet.mjs    contact sheets: node sheet.mjs out.png <cols> <cellW> <cellMaxH> file.png::label ...   (CROP=1000:440 to crop to a drawer)
e2e.mjs      real-click/typing test harness; flows.mjs holds the flows (FLOWS=./other.mjs to use another file)

Paths inside assume the demo is at ~/Documents/Personal/ThingsRemembered-demo.
