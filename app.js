const $ = (selector) => document.querySelector(selector);
const picker = $('#picker');
const canvas = $('#canvas');
const ctx = canvas.getContext('2d');
let files = [], current = 0, position = 'left', color = '#ffffff', image = null;

const isImageFile = (file) => Boolean(file && ((file.type && file.type.startsWith('image/')) || /\.(jpe?g|png|webp|gif|bmp|heic)$/i.test(file.name || '')));

function acceptFiles(list) {
  const selected = [...list].filter(isImageFile);
  if (!selected.length) { $('#fileInfo').textContent = 'Khong nhan dien duoc anh. Hay chon JPG, PNG hoac WEBP.'; return; }
  files = selected; current = 0; $('#status').textContent = 'Dang doc anh...'; renderThumbs(); loadImage(); picker.value = '';
}

picker.onchange = (event) => acceptFiles(event.target.files);
const upload = $('.upload');
upload.ondragover = (event) => { event.preventDefault(); upload.style.background = '#dbeafe'; };
upload.ondragleave = () => { upload.style.background = ''; };
upload.ondrop = (event) => { event.preventDefault(); upload.style.background = ''; acceptFiles(event.dataTransfer.files); };

function renderThumbs() {
  const box = $('#files'); box.innerHTML = '';
  files.forEach((file, index) => {
    const img = document.createElement('img');
    img.src = URL.createObjectURL(file); img.className = 'thumb ' + (index === current ? 'active' : '');
    img.onclick = () => { current = index; renderThumbs(); loadImage(); };
    box.append(img);
  });
  $('#fileInfo').textContent = files.length ? `${files.length} anh da chon` : 'Chua co anh nao duoc chon';
}

function loadImage() {
  if (!files.length) return;
  const reader = new FileReader();
  reader.onload = () => {
    image = new Image();
    image.onload = () => { canvas.hidden = false; $('#preview .empty').style.display = 'none'; $('#downloadOne').disabled = false; $('#downloadZip').disabled = false; $('#shareZalo').disabled = false; $('#dimensions').textContent = `Kich thuoc goc: ${image.naturalWidth} x ${image.naturalHeight} px`; $('#status').textContent = `Da tai ${files.length} anh`; draw(); };
    image.onerror = () => { $('#fileInfo').textContent = 'Trinh duyet khong doc duoc anh nay. Hay doi sang JPG hoac PNG.'; };
    image.src = reader.result;
  };
  reader.onerror = () => { $('#fileInfo').textContent = 'Khong the doc tep anh tren may tinh.'; };
  reader.readAsDataURL(files[current]);
}

function draw() {
  if (!image) return;
  canvas.width = image.naturalWidth; canvas.height = image.naturalHeight; ctx.drawImage(image, 0, 0);
  const text = $('#customer').value.trim(); if (!text) return;
  const size = +$('#fontSize').value, pad = Math.max(16, size * .45);
  ctx.font = `700 ${size}px system-ui, sans-serif`; ctx.textBaseline = 'middle'; ctx.lineJoin = 'round';
  const tw = ctx.measureText(text).width; let x = pad, y = canvas.height - pad;
  if (position === 'center') x = (canvas.width - tw) / 2;
  else if (position === 'right') x = canvas.width - tw - pad;
  else if (position === 'top-right') { x = canvas.width - tw - pad; y = pad; }
  ctx.strokeStyle = color === '#ffffff' ? 'rgba(0,0,0,.55)' : 'rgba(255,255,255,.55)'; ctx.lineWidth = Math.max(2, size * .08); ctx.strokeText(text, x, y); ctx.fillStyle = color; ctx.fillText(text, x, y);
}

$('#customer').oninput = draw;
$('#fontSize').oninput = (event) => { $('#sizeValue').textContent = event.target.value + ' px'; draw(); };
$('#positions').onclick = (event) => { const button = event.target.closest('[data-pos]'); if (!button) return; position = button.dataset.pos; document.querySelectorAll('[data-pos]').forEach((item) => item.classList.toggle('active', item === button)); draw(); };
document.querySelectorAll('[data-color]').forEach((button) => button.onclick = () => { color = button.dataset.color; document.querySelectorAll('[data-color]').forEach((item) => item.classList.toggle('active', item === button)); draw(); });
$('#customColor').oninput = (event) => { color = event.target.value; document.querySelectorAll('[data-color]').forEach((item) => item.classList.remove('active')); draw(); };

function blobFor(file, done) { const type = file.type === 'image/png' ? 'image/png' : (file.type === 'image/webp' ? 'image/webp' : 'image/jpeg'); canvas.toBlob(done, type, 1); }
function saveBlob(blob, name) { const link = document.createElement('a'); link.href = URL.createObjectURL(blob); link.download = name; link.click(); setTimeout(() => URL.revokeObjectURL(link.href), 1200); }
$('#downloadOne').onclick = () => { if (!files.length) return; draw(); blobFor(files[current], (blob) => saveBlob(blob, 'dong-dau-' + files[current].name)); };
async function watermarkedBlob(index) { return new Promise((resolve) => { const reader = new FileReader(); reader.onload = () => { const img = new Image(); img.onload = () => { image = img; draw(); blobFor(files[index], resolve); }; img.onerror = () => resolve(null); img.src = reader.result; }; reader.onerror = () => resolve(null); reader.readAsDataURL(files[index]); }); }
$('#downloadZip').onclick = async () => { if (!files.length || !window.JSZip) { $('#status').textContent = 'Khong tai duoc thu vien ZIP. Hay kiem tra ket noi mang.'; return; } const old = current, zip = new JSZip(); $('#status').textContent = 'Dang tao tep ZIP...'; for (let i = 0; i < files.length; i++) { current = i; renderThumbs(); const blob = await watermarkedBlob(i); if (blob) zip.file('dong-dau-' + files[i].name, blob); } current = old; loadImage(); const output = await zip.generateAsync({ type: 'blob', compression: 'STORE' }); saveBlob(output, 'dong-dau-khach.zip'); $('#status').textContent = `Da tao ZIP gom ${files.length} anh.`; };
$('#shareZalo').onclick = async () => { if (!files.length) return; const old = current, blob = await watermarkedBlob(current); current = old; loadImage(); if (!blob) return; const file = new File([blob], 'dong-dau-' + files[old].name, { type: blob.type }); if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) { try { await navigator.share({ title: 'Anh da dong dau', text: 'Anh san pham', files: [file] }); } catch (error) { if (error.name !== 'AbortError') $('#status').textContent = 'Khong the mo bang chia se tren thiet bi nay.'; } } else { $('#status').textContent = 'Thiet bi khong ho tro chia se tep. Hay tai anh roi chia se qua Zalo.'; } };
