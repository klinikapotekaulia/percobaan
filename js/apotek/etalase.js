/**
 * js/apotek/etalase.js
 * Haypop Etalase: master produk/harga + laporan penjualan bundling.
 * Pengaturan hanya untuk role Keuangan.
 */
window.AppApotekEtalase = {
    produk: [], sales: [],
    bulan: (window.Utils && Utils.thisMonth) ? Utils.thisMonth() : new Date().toISOString().slice(0,7),
    unsubProduk: null, unsubSales: null,
    render: function () {
        return '<div class="page-enter max-w-6xl space-y-4"><div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3"><div><h2 class="text-xl font-bold text-gray-800 dark:text-white">Etalase Haypop</h2><p class="text-sm text-slate-500 dark:text-slate-400">Pengaturan produk bundling dan penjualan etalase terpisah dari keuangan.</p></div><button onclick="AppApotekEtalase.bukaFormProduk()" class="px-4 py-2 rounded-xl bg-primary-600 hover:bg-primary-700 text-white text-sm font-bold flex items-center gap-2"><i data-lucide="plus" class="w-4 h-4"></i> Produk Etalase</button></div><div id="etalase-content"><div class="flex justify-center py-16"><div class="spinner"></div></div></div></div>';
    },
    init: function () {
        if ((window.currentRole || '') !== 'keuangan') { document.getElementById('etalase-content').innerHTML = '<div class="p-6 rounded-xl border bg-white dark:bg-slate-800 text-red-500">Akses Etalase hanya untuk Keuangan.</div>'; return; }
        this.listenProduk(); this.listenSales();
    },
    destroy: function () { if (this.unsubProduk) this.unsubProduk(); if (this.unsubSales) this.unsubSales(); this.unsubProduk=null; this.unsubSales=null; },
    listenProduk: function () {
        var self=this;
        this.unsubProduk=db.collection('etalaseProduk').onSnapshot(function(snap){ self.produk=[]; snap.forEach(function(doc){var d=doc.data();d.id=doc.id;self.produk.push(d);}); self.produk.sort(function(a,b){return String(a.nama||'').localeCompare(String(b.nama||''));}); self.renderView(); },function(err){Utils.toast('Gagal memuat produk Etalase: '+err.message,'error');});
    },
    listenSales: function () {
        var self=this,start=this.bulan+'-01',p=this.bulan.split('-'),last=new Date(parseInt(p[0],10),parseInt(p[1],10),0).getDate(),end=this.bulan+'-'+String(last).padStart(2,'0');
        this.unsubSales=db.collection('etalasePenjualan').where('tanggal','>=',start).where('tanggal','<=',end).orderBy('tanggal','desc').onSnapshot(function(snap){self.sales=[];snap.forEach(function(doc){var d=doc.data();d.id=doc.id;self.sales.push(d);});self.renderView();},function(err){Utils.toast('Gagal memuat penjualan Etalase: '+err.message,'error');});
    },
    ubahBulan:function(bulan){this.bulan=bulan||this.bulan;if(this.unsubSales)this.unsubSales();this.listenSales();},
    renderView:function(){
        var c=document.getElementById('etalase-content');if(!c)return;var total=0,qty=0,byProduct={};
        this.sales.forEach(function(s){(s.items||[]).forEach(function(i){var q=Number(i.qty)||0,sub=Number(i.subtotal)||0;qty+=q;total+=sub;byProduct[i.produkId]=byProduct[i.produkId]||{nama:i.namaProduk||'-',qty:0,total:0};byProduct[i.produkId].qty+=q;byProduct[i.produkId].total+=sub;});});
        var html='<div class="space-y-4"><div class="grid grid-cols-1 sm:grid-cols-3 gap-4"><div class="bg-white dark:bg-slate-800 border rounded-xl p-4"><div class="text-xs text-slate-400">Periode</div><div class="font-bold mt-1">'+Utils.escapeHtml(this.bulan)+'</div></div><div class="bg-white dark:bg-slate-800 border rounded-xl p-4"><div class="text-xs text-slate-400">Qty Terjual</div><div class="text-xl font-black mt-1">'+qty+'</div></div><div class="bg-white dark:bg-slate-800 border rounded-xl p-4"><div class="text-xs text-slate-400">Total Penjualan Etalase</div><div class="text-xl font-black text-emerald-600 mt-1">'+Utils.formatRupiah(total)+'</div></div></div>';
        html+='<div class="bg-white dark:bg-slate-800 border rounded-xl p-4"><label class="text-xs font-semibold text-slate-500">Bulan Penjualan</label><input type="month" value="'+this.bulan+'" onchange="AppApotekEtalase.ubahBulan(this.value)" class="block mt-1 px-3 py-2 rounded-lg border dark:bg-slate-900"></div>';
        html+='<div class="grid grid-cols-1 lg:grid-cols-2 gap-4"><div class="bg-white dark:bg-slate-800 border rounded-xl p-4"><div class="flex justify-between mb-3"><h3 class="font-bold">Produk & Harga</h3><span class="text-xs text-slate-400">Keuangan</span></div>';
        if(!this.produk.length)html+='<p class="text-sm text-slate-400 py-6 text-center">Belum ada produk Etalase.</p>';
        this.produk.forEach(function(p){html+='<div class="flex items-center justify-between gap-3 py-3 border-b last:border-0"><div><div class="font-semibold text-sm">'+Utils.escapeHtml(p.nama)+'</div><div class="text-xs text-slate-400">'+(p.aktif!==false?'Aktif':'Nonaktif')+'</div></div><div class="flex items-center gap-3"><b class="text-emerald-600">'+Utils.formatRupiah(p.harga)+'</b><button onclick="AppApotekEtalase.bukaFormProduk(\''+p.id+'\')" class="text-xs text-primary-600 font-bold">Edit</button></div></div>';});
        html+='</div><div class="bg-white dark:bg-slate-800 border rounded-xl p-4"><h3 class="font-bold mb-3">Ringkasan Penjualan</h3>';var keys=Object.keys(byProduct);if(!keys.length)html+='<p class="text-sm text-slate-400 py-6 text-center">Belum ada penjualan Etalase.</p>';keys.forEach(function(k){var x=byProduct[k];html+='<div class="flex justify-between py-2 border-b last:border-0 text-sm"><span>'+Utils.escapeHtml(x.nama)+' × '+x.qty+'</span><b>'+Utils.formatRupiah(x.total)+'</b></div>';});
        html+='</div></div><div class="bg-sky-50 dark:bg-sky-900/20 border border-sky-100 dark:border-sky-800 rounded-xl p-4 text-xs text-sky-700 dark:text-sky-300">Penjualan Etalase dicatat terpisah. Data ini tidak membuat jurnal pendapatan, tidak masuk HPP/persediaan, dan tidak masuk payroll.</div></div>';
        c.innerHTML=html;if(window.lucide)lucide.createIcons();
    },
    bukaFormProduk:function(id){var p=id?this.produk.find(function(x){return x.id===id;}):null;var html='<div class="p-6 space-y-4"><div class="flex justify-between"><h3 class="font-bold text-lg">'+(p?'Edit Produk Etalase':'Produk Etalase Baru')+'</h3><button onclick="Utils.closeModal()"><i data-lucide="x" class="w-5 h-5"></i></button></div><div><label class="text-xs font-semibold">Nama Produk</label><input id="etalase-nama" value="'+Utils.escapeHtml(p?p.nama:'')+'" class="w-full mt-1 px-3 py-2 border rounded-lg"></div><div><label class="text-xs font-semibold">Harga Jual Bundling</label><input id="etalase-harga" type="number" min="0" value="'+(p?p.harga:'')+'" class="w-full mt-1 px-3 py-2 border rounded-lg"></div><label class="flex items-center gap-2 text-sm"><input id="etalase-aktif" type="checkbox" '+((!p||p.aktif!==false)?'checked':'')+'> Aktif di transaksi</label><div class="flex justify-end gap-2"><button onclick="Utils.closeModal()" class="px-4 py-2 rounded-lg bg-slate-100">Batal</button><button onclick="AppApotekEtalase.simpanProduk(\''+(id||'')+'\')" class="px-4 py-2 rounded-lg bg-primary-600 text-white font-bold">Simpan</button></div></div>';Utils.openModal(html);if(window.lucide)lucide.createIcons();},
    simpanProduk:function(id){var nama=(document.getElementById('etalase-nama').value||'').trim(),harga=Number(document.getElementById('etalase-harga').value)||0,aktif=!!document.getElementById('etalase-aktif').checked;if(!nama){Utils.toast('Nama produk wajib diisi.','error');return;}if(harga<=0){Utils.toast('Harga harus lebih dari 0.','error');return;}var data={nama:nama,harga:harga,aktif:aktif,updatedAt:firebase.firestore.FieldValue.serverTimestamp(),updatedByUid:(auth.currentUser&&auth.currentUser.uid)||''};var op=id?db.collection('etalaseProduk').doc(id).update(data):db.collection('etalaseProduk').add(Object.assign(data,{createdAt:firebase.firestore.FieldValue.serverTimestamp()}));op.then(function(){Utils.closeModal();Utils.toast('Produk Etalase tersimpan.','success');}).catch(function(e){Utils.toast('Gagal menyimpan: '+e.message,'error');});}
};

(function () {
    var patched = false;
    function money(n) { return Number(n) || 0; }
    function getSelection() {
        var rows = document.querySelectorAll('[data-etalase-row]'), items = [];
        rows.forEach(function (row) {
            var productId = row.querySelector('[data-etalase-product]'), qtyEl = row.querySelector('[data-etalase-qty]');
            if (!productId || !productId.value) return;
            var p = (window.AppApotekEtalase.produk || []).find(function (x) { return x.id === productId.value; });
            if (!p || p.aktif === false) return;
            var qty = Math.max(1, parseInt(qtyEl && qtyEl.value, 10) || 1);
            items.push({ produkId:p.id, namaProduk:p.nama||'-', harga:money(p.harga), qty:qty, subtotal:money(p.harga)*qty });
        });
        return items;
    }
    function etalaseTotal() { return getSelection().reduce(function(s,i){return s+i.subtotal;},0); }
    function loadActiveProducts() {
        if (window.AppApotekEtalase._unsubTransaksiProduk) return;
        window.AppApotekEtalase._unsubTransaksiProduk = db.collection('etalaseProduk').where('aktif','==',true).onSnapshot(function(snap){
            window.AppApotekEtalase.produk=[];
            snap.forEach(function(doc){var d=doc.data();d.id=doc.id;window.AppApotekEtalase.produk.push(d);});
            window.AppApotekEtalase.produk.sort(function(a,b){return String(a.nama||'').localeCompare(String(b.nama||''));});
        }, function(err){ console.error('Gagal memuat produk Etalase untuk transaksi:', err); });
    }
    function addRow() {
        var list=document.getElementById('trx-etalase-items'); if(!list)return;
        var row=document.createElement('div'); row.setAttribute('data-etalase-row','1'); row.className='grid grid-cols-1 sm:grid-cols-[1fr_110px_130px_36px] gap-2 items-center';
        var options='<option value="">-- Pilih Produk --</option>';
        (window.AppApotekEtalase.produk||[]).filter(function(p){return p.aktif!==false;}).forEach(function(p){options+='<option value="'+Utils.escapeHtml(p.id)+'">'+Utils.escapeHtml(p.nama)+' — '+Utils.formatRupiah(p.harga)+'</option>';});
        row.innerHTML='<select data-etalase-product class="w-full px-3 py-2 border rounded-lg text-sm dark:bg-slate-700 dark:text-white" onchange="AppApotekEtalase.refreshTransaksiTotal()">'+options+'</select><input data-etalase-qty type="number" min="1" value="1" class="w-full px-3 py-2 border rounded-lg text-sm text-center dark:bg-slate-700 dark:text-white" oninput="AppApotekEtalase.refreshTransaksiTotal()" title="Qty" /><div data-etalase-subtotal class="px-3 py-2 bg-slate-50 dark:bg-slate-900 rounded-lg text-sm font-semibold text-right">Rp 0</div><button type="button" class="p-2 text-red-500" onclick="this.closest(\'[data-etalase-row]\').remove(); AppApotekEtalase.refreshTransaksiTotal();"><i data-lucide="x" class="w-4 h-4"></i></button>';
        list.appendChild(row); if(window.lucide)lucide.createIcons({nodes:[row]});
    }
    function injectUI(app) {
        var content=document.getElementById('trx-content'); if(!content||document.getElementById('trx-etalase-box'))return;
        var box=document.createElement('div'); box.id='trx-etalase-box'; box.className='bg-white dark:bg-slate-800 rounded-xl border border-amber-200 dark:border-amber-800 p-5 mb-4';
        box.innerHTML='<div class="flex items-center justify-between gap-3 mb-3"><div><h3 class="font-semibold text-gray-800 dark:text-white">Etalase Haypop</h3><p class="text-xs text-slate-500">Opsional — hanya ditambahkan jika konsumen memilih bundling.</p></div><label class="flex items-center gap-2 text-sm font-semibold cursor-pointer"><input id="trx-etalase-toggle" type="checkbox" class="w-4 h-4" onchange="AppApotekEtalase.toggleTransaksi(this.checked)"> Tambahkan Etalase</label></div><div id="trx-etalase-items" class="hidden space-y-2"></div><button id="trx-etalase-add" type="button" class="hidden mt-3 text-sm font-semibold text-primary-600" onclick="AppApotekEtalase.tambahBarisTransaksi()">+ Tambah produk Etalase</button>';
        var totalBox=content.querySelector('.bg-white.dark\\:bg-slate-800.rounded-xl.border.border-slate-200'); if(totalBox)content.insertBefore(box,totalBox);else content.appendChild(box);
    }
    window.AppApotekEtalase.toggleTransaksi=function(checked){var list=document.getElementById('trx-etalase-items'),add=document.getElementById('trx-etalase-add');if(checked){loadActiveProducts();if(list){list.classList.remove('hidden');if(!list.children.length){setTimeout(addRow,250);}}if(add)add.classList.remove('hidden');}else{if(list){list.innerHTML='';list.classList.add('hidden');}if(add)add.classList.add('hidden');}AppApotekEtalase.refreshTransaksiTotal();};
    window.AppApotekEtalase.tambahBarisTransaksi=addRow;
    window.AppApotekEtalase.refreshTransaksiTotal=function(){var items=getSelection(),rows=document.querySelectorAll('[data-etalase-row]');rows.forEach(function(row){var sel=row.querySelector('[data-etalase-product]'),sub=row.querySelector('[data-etalase-subtotal]'),p=sel&&sel.value?(window.AppApotekEtalase.produk||[]).find(function(x){return x.id===sel.value;}):null,q=row.querySelector('[data-etalase-qty]');if(sub)sub.textContent=p?Utils.formatRupiah(money(p.harga)*(Math.max(1,parseInt(q&&q.value,10)||1))):'Rp 0';});var grand=document.getElementById('trx-grand-total');if(grand&&document.getElementById('trx-etalase-toggle')&&document.getElementById('trx-etalase-toggle').checked){var raw=(grand.textContent||'').replace(/[^0-9]/g,'');grand.textContent=Utils.formatRupiah((Number(raw)||0)+items.reduce(function(s,i){return s+i.subtotal;},0));}};
    function patchWhenReady(){
        if(patched||!window.AppApotekTransaksi||!window.AppApotekEtalase)return; patched=true; loadActiveProducts();
        var app=window.AppApotekTransaksi, originalRenderForm=app.renderForm;
        app.renderForm=function(){var r=originalRenderForm.apply(this,arguments);injectUI(this);return r;};
        var originalHitungTotal=app.hitungTotal;
        app.hitungTotal=function(){var r=originalHitungTotal.apply(this,arguments),grand=document.getElementById('trx-grand-total'),base=0;if(grand){base=Number((grand.textContent||'').replace(/[^0-9]/g,''))||0;this._lastCalculatedTotal=base;if(document.getElementById('trx-etalase-toggle')&&document.getElementById('trx-etalase-toggle').checked)grand.textContent=Utils.formatRupiah(base+etalaseTotal());}return r;};
        var originalCetak=app.cetakStruk;
        app.cetakStruk=function(data,w){if(data&&data.totalBayarKonsumen)return originalCetak.call(this,Object.assign({},data,{totalAkhir:data.totalBayarKonsumen}),w);return originalCetak.apply(this,arguments);};
        var originalRunTransaction=db.runTransaction.bind(db);
        db.runTransaction=function(updateFunction){var pendingItems=getSelection(),pendingTotal=pendingItems.reduce(function(s,i){return s+i.subtotal;},0),pendingEnabled=!!(document.getElementById('trx-etalase-toggle')&&document.getElementById('trx-etalase-toggle').checked&&pendingItems.length);return originalRunTransaction(function(tx){var originalSet=tx.set.bind(tx);tx.set=function(ref,data,options){if(pendingEnabled&&ref&&ref.path&&ref.path.indexOf('transaksi/')===0&&data&&typeof data==='object'){data.etalaseItems=pendingItems;data.etalaseTotal=pendingTotal;data.totalBayarKonsumen=money(data.totalAkhir)+pendingTotal;data.etalaseBundling=true;originalSet(ref,data,options);var saleRef=db.collection('etalasePenjualan').doc(ref.id);tx.set(saleRef,{transaksiId:ref.id,tanggal:data.tanggal||Utils.today(),items:pendingItems,total:pendingTotal,createdAt:firebase.firestore.FieldValue.serverTimestamp(),createdByUid:(auth.currentUser&&auth.currentUser.uid)||''});return;}return originalSet(ref,data,options);};return updateFunction(tx);});};
    }
    var timer=setInterval(function(){if(window.AppApotekTransaksi){clearInterval(timer);patchWhenReady();}},100); if(window.AppApotekTransaksi)patchWhenReady();
})();
