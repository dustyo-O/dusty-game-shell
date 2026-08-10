const canvas = document.getElementById("game") as HTMLCanvasElement;
const ctx = canvas.getContext("2d")!;

const W = canvas.width;
const H = canvas.height;

let t = 0;

function draw(): void {
  t += 1;

  ctx.fillStyle = "#0b0b12";
  ctx.fillRect(0, 0, W, H);

  const bob = Math.sin(t / 20) * 8;

  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.font = "bold 28px monospace";
  ctx.fillStyle = "#7dd3fc";
  ctx.fillText("DUSTY GAME STUDIO", W / 2, H / 2 - 30 + bob);

  ctx.font = "16px monospace";
  ctx.fillStyle = "#f5f5f5";
  ctx.fillText("hello world — pipeline is live", W / 2, H / 2 + 10 + bob);

  ctx.font = "12px monospace";
  ctx.fillStyle = "#94a3b8";
  ctx.fillText("games/hello-world", W / 2, H / 2 + 36 + bob);

  requestAnimationFrame(draw);
}

requestAnimationFrame(draw);
