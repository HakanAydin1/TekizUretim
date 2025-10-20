import React from 'react';

const DashboardPage: React.FC = () => {
  return (
    <section className="space-y-4">
      <div className="rounded bg-white p-4 shadow">
        <h2 className="text-lg font-semibold text-slate-800">Hoş geldiniz</h2>
        <p className="text-sm text-slate-600">
          Rolünüze göre sol menüden sipariş girişi, planlama, üretim ve log ekranlarına ulaşabilirsiniz.
        </p>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded bg-white p-4 shadow">
          <h3 className="text-sm font-semibold text-slate-700">Planlama Akışı</h3>
          <ul className="list-disc space-y-1 pl-4 text-sm text-slate-600">
            <li>Siparişleri girin veya CSV import edin.</li>
            <li>Planlama tahtasında öneri oluşturun.</li>
            <li>Planı yayınlayarak üretime bildirin.</li>
          </ul>
        </div>
        <div className="rounded bg-white p-4 shadow">
          <h3 className="text-sm font-semibold text-slate-700">Gerçek Zamanlı Bildirim</h3>
          <p className="text-sm text-slate-600">
            Yayın sonrası üretim ekranı otomatik güncellenir ve e-posta mock kaydı alınır.
          </p>
        </div>
      </div>
    </section>
  );
};

export default DashboardPage;
