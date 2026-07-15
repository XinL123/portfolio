"""Deterministic source transformations for the pinned Codex pet runtime."""

from __future__ import annotations

import hashlib
import json
import plistlib
import struct
from pathlib import Path

from .spec import SUPPORTED_ASAR_SHA256, SUPPORTED_BUILD, SUPPORTED_VERSION


class PatchMismatch(RuntimeError):
    """Raised when the installed bundle no longer matches the pinned build."""


def inspect_app(app_path: str | Path) -> dict[str, str | Path]:
    app = Path(app_path)
    info_path = app / "Contents" / "Info.plist"
    asar_path = app / "Contents" / "Resources" / "app.asar"
    with info_path.open("rb") as stream:
        info = plistlib.load(stream)
    version = str(info.get("CFBundleShortVersionString", ""))
    build = str(info.get("CFBundleVersion", ""))
    if version != SUPPORTED_VERSION:
        raise PatchMismatch(
            f"Codex version mismatch: expected {SUPPORTED_VERSION}, found {version}"
        )
    if build != SUPPORTED_BUILD:
        raise PatchMismatch(
            f"Codex build mismatch: expected {SUPPORTED_BUILD}, found {build}"
        )
    digest = hashlib.sha256(asar_path.read_bytes()).hexdigest()
    if digest != SUPPORTED_ASAR_SHA256:
        raise PatchMismatch(
            f"app.asar hash mismatch: expected {SUPPORTED_ASAR_SHA256}, found {digest}"
        )
    return {
        "app": app,
        "info_plist": info_path,
        "asar": asar_path,
        "version": version,
        "build": build,
        "asar_sha256": digest,
    }


def _read_asar(path: Path) -> tuple[dict, bytes, int, bytes]:
    archive = path.read_bytes()
    if len(archive) < 16:
        raise PatchMismatch("app.asar is too short")
    first_payload, header_pickle_size, inner_payload_size, json_size = struct.unpack_from(
        "<4I", archive, 0
    )
    if first_payload != 4 or header_pickle_size != inner_payload_size + 4:
        raise PatchMismatch("unsupported ASAR header layout")
    header_json = archive[16 : 16 + json_size]
    try:
        header = json.loads(header_json)
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise PatchMismatch(f"invalid ASAR header: {error}") from error
    return header, archive, 8 + header_pickle_size, header_json


def _packed_nodes(header: dict) -> list[tuple[int, str, dict]]:
    nodes: list[tuple[int, str, dict]] = []

    def visit(node: dict, prefix: str = "") -> None:
        for name, child in node.get("files", {}).items():
            path = f"{prefix}/{name}" if prefix else name
            if "files" in child:
                visit(child, path)
            elif not child.get("unpacked") and "offset" in child and "size" in child:
                nodes.append((int(child["offset"]), path, child))

    visit(header)
    return sorted(nodes)


def _integrity(content: bytes, block_size: int) -> dict:
    blocks = [
        hashlib.sha256(content[index : index + block_size]).hexdigest()
        for index in range(0, len(content), block_size)
    ]
    return {
        "algorithm": "SHA256",
        "hash": hashlib.sha256(content).hexdigest(),
        "blockSize": block_size,
        "blocks": blocks,
    }


def _encode_header(header: dict) -> tuple[bytes, bytes]:
    header_json = json.dumps(header, separators=(",", ":")).encode()
    padding = b"\0" * ((4 - (4 + len(header_json)) % 4) % 4)
    inner_payload_size = 4 + len(header_json) + len(padding)
    second_pickle = (
        struct.pack("<I", inner_payload_size)
        + struct.pack("<I", len(header_json))
        + header_json
        + padding
    )
    return struct.pack("<II", 4, len(second_pickle)) + second_pickle, header_json


def rewrite_asar(
    source_path: str | Path,
    output_path: str | Path,
    replacements: dict[str, bytes],
) -> dict:
    source = Path(source_path)
    output = Path(output_path)
    header, archive, data_base, _ = _read_asar(source)
    packed = _packed_nodes(header)
    known_paths = {path for _, path, _ in packed}
    missing = sorted(set(replacements) - known_paths)
    if missing:
        raise PatchMismatch(f"ASAR replacement targets not found: {missing}")

    payloads: list[bytes] = []
    result_files: dict[str, bytes] = {}
    offset = 0
    for old_offset, path, node in packed:
        original = archive[data_base + old_offset : data_base + old_offset + int(node["size"])]
        content = replacements.get(path, original)
        node["offset"] = str(offset)
        node["size"] = len(content)
        if "integrity" in node:
            block_size = int(node["integrity"].get("blockSize", 4_194_304))
            node["integrity"] = _integrity(content, block_size)
        payloads.append(content)
        result_files[path] = content
        offset += len(content)

    encoded_header, header_json = _encode_header(header)
    output.parent.mkdir(parents=True, exist_ok=True)
    output.write_bytes(encoded_header + b"".join(payloads))
    return {
        "files": result_files,
        "header_json": header_json,
        "header_hash": hashlib.sha256(header_json).hexdigest(),
        "asar_sha256": hashlib.sha256(output.read_bytes()).hexdigest(),
    }


def replace_exactly_once(source: str, old: str, new: str, label: str) -> str:
    count = source.count(old)
    if count != 1:
        raise PatchMismatch(f"{label}: expected 1 match, found {count}")
    return source.replace(old, new, 1)


def _replace_between(
    source: str,
    start_marker: str,
    end_marker: str | None,
    replacement: str,
    label: str,
) -> str:
    if source.count(start_marker) != 1:
        raise PatchMismatch(
            f"{label} start: expected 1 match, found {source.count(start_marker)}"
        )
    start = source.index(start_marker)
    if end_marker is None:
        end = len(source)
    else:
        end_count = source.count(end_marker, start + len(start_marker))
        if end_count < 1:
            raise PatchMismatch(f"{label} end: expected a following {end_marker!r}")
        end = source.index(end_marker, start + len(start_marker))
    return source[:start] + replacement + source[end:]


OLD_PLAYBACK = (
    "function O(e,t){let n=R[e];if(t)return{frames:[n[0]],loopStartIndex:null};"
    "if(e===`idle`)return{frames:L,loopStartIndex:0};let r=[...n,...n,...n];"
    "return{frames:[...r,...L],loopStartIndex:r.length}}"
)
NEW_PLAYBACK = (
    "var KITTY_CONTINUOUS_STATES=new Set([`idle`,`running-left`,`running-right`,"
    "`jumping`,`review`,`failed`,`waiting`,`running`]);"
    "function O(e,t){let n=R[e];if(t)return{frames:[n[0]],loopStartIndex:null};"
    "return{frames:n,loopStartIndex:KITTY_CONTINUOUS_STATES.has(e)?0:null}}"
)
OLD_FRAME_TABLE = (
    "R={failed:k(5,8,140,240),idle:I,jumping:k(4,5,140,280),"
    "review:k(8,6,150,280),running:k(7,6,120,220),"
    '"running-left":k(2,8,120,220),"running-right":k(1,8,120,220),'
    "waving:k(3,4,140,280),waiting:k(6,6,150,260)}"
)
NEW_FRAME_TABLE = (
    "R={failed:k(5,8,140,240),idle:I,jumping:k(4,6,220,220),"
    "review:k(8,6,200,200),running:k(7,6,500,500),"
    '"running-left":k(2,8,120,220),"running-right":k(1,8,120,220),'
    "waving:k(3,4,350,350),waiting:k(6,6,320,320)}"
)

KITTY_DESKTOP_PLAYER = r"""var KITTY_DESKTOP_FRAME_TABLE={idle:[0,6,280],"running-right":[1,8,140],"running-left":[2,8,140],waving:[3,4,350],jumping:[4,6,220],failed:[5,8,240],waiting:[6,6,320],running:[7,6,500],review:[8,6,200]};"""


def patch_codex_avatar(source: str) -> str:
    patched = replace_exactly_once(
        source, OLD_PLAYBACK, NEW_PLAYBACK, "sprite playback policy"
    )
    patched = replace_exactly_once(
        patched, OLD_FRAME_TABLE, NEW_FRAME_TABLE, "sprite frame table"
    )
    return patched


NEW_MASCOT_COMPONENT = r"""function g(e){let{ariaLabel:n,assetRef:r,className:i,notificationBadge:a,onContextMenu:o,resizeHandle:s,spritesheetUrl:c,state:l,style:u,transientState:d}=e,p=l===void 0?`idle`:l,[m,g]=(0,b.useState)(!1),[v,S]=(0,b.useState)(!1),[C,w]=(0,b.useState)(!1),[T,E]=(0,b.useState)(!1),[D,O]=(0,b.useState)(!1),[j,M]=(0,b.useState)(0),N=(0,b.useRef)(null),P=(0,b.useRef)(null),F=(0,b.useRef)(-1/0),Q=(0,b.useRef)(null),I=p===`running`||p===`failed`?p:`idle`,L=()=>{T(!1),M(e=>e+1)};(0,b.useEffect)(()=>{if(I!==`idle`||m||v||C||d!=null)return;let e=window.setTimeout(()=>{T(!0)},KITTY_INACTIVITY_MS);return()=>window.clearTimeout(e)},[I,m,v,C,d,j]);(0,b.useEffect)(()=>{let e=window.setTimeout(()=>{I===`idle`&&!m&&!v&&!C&&d==null&&(D(!0),window.setTimeout(()=>D(!1),3660))},KITTY_PERIODIC_SAD_MS);return()=>window.clearTimeout(e)},[I,m,v,C,d,j]);(0,b.useEffect)(()=>{let e=()=>{L(),S(!0),N.current!=null&&window.clearTimeout(N.current),N.current=window.setTimeout(()=>{N.current=null,S(!1)},1200)},t=()=>{let e=Date.now();e-F.current<KITTY_FOREGROUND_COOLDOWN_MS||(F.current=e,w(!0),P.current!=null&&window.clearTimeout(P.current),P.current=window.setTimeout(()=>{P.current=null,w(!1)},1400))};return window.addEventListener(`kitty-pat`,e),window.addEventListener(`kitty-main-window-foreground`,t),()=>{window.removeEventListener(`kitty-pat`,e),window.removeEventListener(`kitty-main-window-foreground`,t),N.current!=null&&window.clearTimeout(N.current),P.current!=null&&window.clearTimeout(P.current)}},[]);let R=d??(v?`review`:m?`jumping`:C?`waving`:I===`failed`?`failed`:I===`running`?`running`:D?`failed`:T?`waiting`:`idle`);(0,b.useEffect)(()=>{if(c==null)return;let e=Q.current;if(e==null)return;let[t,n,a]=KITTY_DESKTOP_FRAME_TABLE[R]??KITTY_DESKTOP_FRAME_TABLE.idle,o=0,s=null,l=()=>{e.style.backgroundPosition=`${o/7*100}% ${t/8*100}%`,s=window.setTimeout(()=>{o=(o+1)%n,l()},a)};return l(),()=>{s!=null&&window.clearTimeout(s)}},[R,c]);let z=a!=null,B=z||s!=null,U;n!=null&&(U=B?`group`:`img`);let H=f(`codex-avatar-button relative flex cursor-interaction items-center justify-center active:cursor-grabbing`,i),V=n==null&&!B?!0:void 0,W=c==null?(0,x.jsx)(h,{assetRef:r,className:`relative z-10`,state:R}):(0,x.jsx)(`div`,{ref:Q,className:`codex-avatar-root relative z-10`,style:{backgroundImage:`url(${c})`,backgroundSize:`800% 900%`,backgroundRepeat:`no-repeat`},"data-avatar-state":R,"aria-hidden":`true`,"data-testid":`codex-avatar`}),G=z?(0,x.jsx)(_,{notificationBadge:a}):null,q=s==null?null:(0,x.jsx)(`div`,{className:`group absolute right-0 bottom-0 z-30 flex size-12 cursor-default items-end justify-end rounded-[8px] text-token-text-secondary hover:text-token-foreground`,"data-testid":`avatar-overlay-resize-hover-target`,children:(0,x.jsx)(`button`,{type:`button`,"aria-label":s.ariaLabel,className:`no-drag codex-avatar-resize-handle flex size-5 cursor-nwse-resize touch-none items-center justify-center rounded-[6px]`,"data-testid":`avatar-overlay-resize-handle`,onLostPointerCapture:s.onLostPointerCapture,onPointerCancel:s.onPointerCancel,onPointerDown:s.onPointerDown,onPointerEnter:s.onPointerEnter,onPointerLeave:s.onPointerLeave,onPointerMove:s.onPointerMove,onPointerUp:s.onPointerUp})});return(0,x.jsxs)(`div`,{className:H,"data-avatar-mascot":`true`,"data-testid":`avatar-mascot-button`,"aria-hidden":V,"aria-label":n,role:U,onContextMenu:o,onPointerEnter:()=>{L(),g(!0)},onPointerLeave:()=>{g(!1)},onPointerDown:L,style:u,children:[W,G,q]})}"""
NEW_MASCOT_COMPONENT = NEW_MASCOT_COMPONENT.replace(
    "let R=d??(",
    "let X=d===`running-left`||d===`running-right`?d:null,R=X??(",
)
NEW_MASCOT_COMPONENT = replace_exactly_once(
    NEW_MASCOT_COMPONENT,
    "Q=(0,b.useRef)(null),I=",
    "Q=(0,b.useRef)(null),Y=(0,b.useRef)(null),I=",
    "local click tracking ref",
)
NEW_MASCOT_COMPONENT = replace_exactly_once(
    NEW_MASCOT_COMPONENT,
    "L=()=>{T(!1),",
    "L=()=>{E(!1),",
    "interaction resets sleep through setter",
)
NEW_MASCOT_COMPONENT = replace_exactly_once(
    NEW_MASCOT_COMPONENT,
    "let e=()=>{L(),S(!0),N.current!=null&&window.clearTimeout(N.current),N.current=window.setTimeout(()=>{N.current=null,S(!1)},1200)},t=()=>{",
    "let t=()=>{",
    "remove cross-window pat handler",
)
NEW_MASCOT_COMPONENT = replace_exactly_once(
    NEW_MASCOT_COMPONENT,
    "return window.addEventListener(`kitty-pat`,e),window.addEventListener(`kitty-main-window-foreground`,t),()=>{window.removeEventListener(`kitty-pat`,e),window.removeEventListener(`kitty-main-window-foreground`,t)",
    "return window.addEventListener(`kitty-main-window-foreground`,t),()=>{window.removeEventListener(`kitty-main-window-foreground`,t)",
    "remove cross-window pat listener",
)
NEW_MASCOT_COMPONENT = replace_exactly_once(
    NEW_MASCOT_COMPONENT,
    "R=X??(v?`review`:m?`jumping`",
    "R=X??(v?`waiting`:m?`jumping`",
    "click feedback state",
)
NEW_MASCOT_COMPONENT = replace_exactly_once(
    NEW_MASCOT_COMPONENT,
    "let z=a!=null",
    "let K=e=>{L(),Y.current={moved:!1,pointerId:e.pointerId,x:e.clientX,y:e.clientY}},Z=e=>{let t=Y.current;e.buttons===0&&(L(),g(!0)),t!=null&&t.pointerId===e.pointerId&&Math.hypot(e.clientX-t.x,e.clientY-t.y)>=KITTY_CLICK_MOVE_PX&&(t.moved=!0)},$=e=>{let t=Y.current;Y.current=null,t!=null&&t.pointerId===e.pointerId&&!t.moved&&(L(),S(!0),N.current!=null&&window.clearTimeout(N.current),N.current=window.setTimeout(()=>{N.current=null,S(!1)},1200))},ee=e=>{Y.current?.pointerId===e.pointerId&&(Y.current=null)};let z=a!=null",
    "local pointer recognizer",
)
NEW_MASCOT_COMPONENT = replace_exactly_once(
    NEW_MASCOT_COMPONENT,
    "onPointerEnter:()=>{L(),g(!0)},onPointerLeave:()=>{g(!1)},onPointerDown:L,style:u",
    "onPointerEnter:()=>{L(),g(!0)},onPointerLeave:()=>{g(!1)},onPointerMove:Z,onPointerDown:K,onPointerUp:$,onPointerCancel:ee,style:u",
    "local pointer event wiring",
)


def patch_mascot_button(source: str) -> str:
    constants = (
        "var KITTY_INACTIVITY_MS=18e4,KITTY_PERIODIC_SAD_MS=15e5,"
        "KITTY_FOREGROUND_COOLDOWN_MS=1e4,KITTY_CLICK_MOVE_PX=4;"
        + KITTY_DESKTOP_PLAYER
    )
    if "function _(" in source:
        return _replace_between(
            source,
            "function g(e)",
            "function _(",
            constants + NEW_MASCOT_COMPONENT,
            "mascot component",
        )
    return _replace_between(
        source,
        "function g(e)",
        None,
        constants + NEW_MASCOT_COMPONENT,
        "mascot component fixture",
    )


def patch_overlay_page(source: str) -> str:
    candidates = {
        "onMascotClick:()=>{u.dispatchMessage(`open-current-main-window`,{})}":
            "onMascotClick:()=>{}",
        "onMascotClick:()=>{d.dispatchMessage(`open-current-main-window`,{})}":
            "onMascotClick:()=>{}",
        "onMascotClick:()=>{r.dispatchMessage(`open-current-main-window`,{})}":
            "onMascotClick:()=>{}",
        "n.dispatchMessage(`open-current-main-window`,{})": "void 0",
        "u.dispatchMessage(`open-current-main-window`,{})": "void 0",
    }
    for old, replacement in candidates.items():
        if old in source:
            if source.count(old) != 1:
                raise PatchMismatch(
                    f"mascot click: expected 1 match, found {source.count(old)}"
                )
            return source.replace(old, replacement, 1)
    raise PatchMismatch("mascot click: expected 1 match, found 0")


def patch_main_focus(source: str) -> str:
    old = "let pe=()=>{fe.refreshApplicationMenu()}"
    new = r"""let pe=(e,n)=>{if(fe.refreshApplicationMenu(),n==null||n.isDestroyed()||n.webContents.getURL().includes(`/avatar-overlay`))return;for(let e of a.BrowserWindow.getAllWindows()){if(e.isDestroyed())continue;let t=e.webContents.getURL();t.includes(`/avatar-overlay`)&&e.webContents.executeJavaScript(`window.dispatchEvent(new Event("kitty-main-window-foreground"))`).catch(()=>{})}}"""
    return replace_exactly_once(source, old, new, "main-window foreground bridge")


def patch_status_labels(source: str) -> str:
    patched = replace_exactly_once(
        source,
        "defaultMessage:`Running`",
        "defaultMessage:`Reading`",
        "running status label",
    )
    return replace_exactly_once(
        patched,
        "defaultMessage:`Blocked`",
        "defaultMessage:`Sad`",
        "failed status label",
    )


def patch_selection(source: str) -> str:
    old = "case`running`:return t+I;case`failed`:return t+L"
    new = "case`running`:return null;case`failed`:return null"
    return replace_exactly_once(source, old, new, "task notification lifetime")


TARGET_PATCHERS = {
    "webview/assets/avatar-mascot-button-D0vsmHD5.js": patch_mascot_button,
    "webview/assets/avatar-overlay-page-BUrCXq6q.js": patch_overlay_page,
    "webview/assets/avatar-overlay-native-page-CVTfoh3j.js": patch_overlay_page,
    "webview/assets/avatar-overlay-pill-dismiss-button-BxsBjKbe.js": patch_status_labels,
    "webview/assets/use-avatar-overlay-selection-C1oldDRW.js": patch_selection,
    ".vite/build/main-8XtuV7fZ.js": patch_main_focus,
}


def _read_packed_files(path: Path, wanted: set[str]) -> dict[str, bytes]:
    header, archive, data_base, _ = _read_asar(path)
    result: dict[str, bytes] = {}
    for offset, file_path, node in _packed_nodes(header):
        if file_path in wanted:
            result[file_path] = archive[
                data_base + offset : data_base + offset + int(node["size"])
            ]
    missing = sorted(wanted - set(result))
    if missing:
        raise PatchMismatch(f"required runtime chunks not found: {missing}")
    return result


def build_candidate(app_path: str | Path, output_path: str | Path) -> dict:
    inspected = inspect_app(app_path)
    asar_path = Path(inspected["asar"])
    originals = _read_packed_files(asar_path, set(TARGET_PATCHERS))
    replacements: dict[str, bytes] = {}
    for path, patcher in TARGET_PATCHERS.items():
        try:
            replacements[path] = patcher(originals[path].decode()).encode()
        except UnicodeDecodeError as error:
            raise PatchMismatch(f"runtime chunk is not UTF-8: {path}") from error
    result = rewrite_asar(asar_path, output_path, replacements)
    verified = _read_packed_files(Path(output_path), set(TARGET_PATCHERS))
    markers = [
        "KITTY_DESKTOP_FRAME_TABLE",
        "kitty-main-window-foreground",
        "KITTY_CLICK_MOVE_PX",
        "KITTY_INACTIVITY_MS",
        "Reading",
        "Sad",
    ]
    joined = b"\n".join(verified.values()).decode(errors="ignore")
    for marker in markers:
        if marker not in joined:
            raise PatchMismatch(f"candidate verification marker missing: {marker}")
    return {
        "source_asar_sha256": inspected["asar_sha256"],
        "asar_sha256": result["asar_sha256"],
        "header_hash": result["header_hash"],
        "target_count": len(replacements),
        "markers": markers,
        "output": str(Path(output_path).resolve()),
    }
