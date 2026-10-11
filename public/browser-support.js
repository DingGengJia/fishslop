/* Keep this preflight ES5-compatible: it also runs before the game bundle on old iPads. */
(function () {
  var unsupported = typeof window.WebGL2RenderingContext === 'undefined';
  window.gameBrowserUnsupported = unsupported;
  if (!unsupported) return;
  document.addEventListener('DOMContentLoaded', function () {
    var screen = document.createElement('section');
    screen.id = 'browser-support';
    screen.setAttribute('role', 'alert');
    screen.style.cssText = 'position:fixed;left:0;top:0;right:0;bottom:0;z-index:10000;overflow:auto;background:#092b35;color:#e8f5ed;padding:40px 24px;font:17px/1.8 -apple-system,BlinkMacSystemFont,sans-serif;box-sizing:border-box;';
    var content = document.createElement('div');
    content.style.cssText = 'max-width:520px;margin:10vh auto;';
    var title = document.createElement('h1');
    title.style.cssText = 'font:600 28px/1.4 -apple-system,BlinkMacSystemFont,sans-serif;margin:0 0 20px;';
    title.textContent = '这个浏览器暂时无法运行此游戏';
    var details = document.createElement('p');
    details.textContent = '当前浏览器缺少三维场景所需的图形功能（WebGL 2）。如果设备支持系统更新，请更新后再试；无法更新的旧 iPad 暂时不能运行当前版本。';
    var note = document.createElement('p');
    note.textContent = '可以在较新的手机、平板或电脑上打开同一地址。';
    var home = document.createElement('a');
    home.href = '/game/';
    home.textContent = '返回游戏目录';
    home.style.cssText = 'display:inline-block;padding:12px 22px;background:#bbefc7;color:#153d3b;border-radius:8px;text-decoration:none;';
    content.appendChild(title);
    content.appendChild(details);
    content.appendChild(note);
    content.appendChild(home);
    screen.appendChild(content);
    document.body.appendChild(screen);
  });
})();
