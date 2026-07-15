onMascotClick:()=>{u.dispatchMessage(`open-current-main-window`,{})}
function tn({currentDragState:e,deltaX:t}){return t>=4?`running-right`:t<=-4?`running-left`:e}
