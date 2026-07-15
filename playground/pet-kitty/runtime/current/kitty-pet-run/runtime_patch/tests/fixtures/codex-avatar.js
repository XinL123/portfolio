function D(e){let originalAnimationHook=e;return originalAnimationHook}
function O(e,t){let n=R[e];if(t)return{frames:[n[0]],loopStartIndex:null};if(e===`idle`)return{frames:L,loopStartIndex:0};let r=[...n,...n,...n];return{frames:[...r,...L],loopStartIndex:r.length}}
R={failed:k(5,8,140,240),idle:I,jumping:k(4,5,140,280),review:k(8,6,150,280),running:k(7,6,120,220),"running-left":k(2,8,120,220),"running-right":k(1,8,120,220),waving:k(3,4,140,280),waiting:k(6,6,150,260)}
function V(e){let originalAvatarComponent=e;return originalAvatarComponent}
function H(e){return e}
