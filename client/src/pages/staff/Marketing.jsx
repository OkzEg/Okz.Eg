import { useState } from 'react';
import { Megaphone, Send, AlertTriangle, Eye } from 'lucide-react';
import { toast } from 'react-toastify';
import api from '../../api/axios';

export default function Marketing() {
  const [subject, setSubject] = useState('');
  const [html, setHtml] = useState(`
<div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; color: #333;">
  <h2 style="color: #000;">Hello {{name}},</h2>
  <p>We have a special announcement for you!</p>
  <p>Shop now and enjoy exclusive discounts on premium leather boots.</p>
  <a href="https://www.okz-eg.store/shop" style="display: inline-block; background-color: #000; color: #fff; text-decoration: none; padding: 12px 24px; border-radius: 4px; font-weight: bold; margin-top: 20px;">Shop Now</a>
</div>
  `.trim());
  const [isSending, setIsSending] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [previewMode, setPreviewMode] = useState(false);

  const handleSend = async () => {
    if (!subject || !html) {
      toast.error('Please provide a subject and HTML content');
      return;
    }
    try {
      setIsSending(true);
      await api.post('/marketing/bulk-email', { subject, html });
      toast.success('Bulk email broadcast started!');
      setShowConfirm(false);
    } catch (err) {
      console.error(err);
      toast.error(err.response?.data?.message || 'Failed to send bulk email');
    } finally {
      setIsSending(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-timber-900 flex items-center gap-2">
            <Megaphone className="w-6 h-6 text-timber-600" />
            Bulk Email / Newsletter
          </h1>
          <p className="text-sm text-timber-500 mt-1">
            Send promotional emails to all registered customers.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor Side */}
        <div className="bg-white rounded-xl shadow-sm border border-timber-100 overflow-hidden flex flex-col h-[700px]">
          <div className="p-4 border-b border-timber-100 flex items-center justify-between bg-timber-50">
            <h2 className="font-semibold text-timber-900">Compose Email</h2>
            <button
              type="button"
              onClick={() => setPreviewMode(!previewMode)}
              className="lg:hidden flex items-center gap-1 text-sm font-medium text-timber-600 bg-white border border-timber-200 px-3 py-1.5 rounded-md"
            >
              <Eye className="w-4 h-4" />
              {previewMode ? 'Edit Mode' : 'Preview'}
            </button>
          </div>
          
          <div className={`p-4 flex-1 overflow-y-auto ${previewMode ? 'hidden lg:block' : 'block'}`}>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-timber-900 mb-1">Subject</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g., Massive Black Friday Sale!"
                  className="w-full rounded-lg border-timber-200 shadow-sm focus:border-timber-900 focus:ring-timber-900 text-sm"
                />
              </div>

              <div className="flex-1 flex flex-col">
                <label className="block text-sm font-medium text-timber-900 mb-1">
                  HTML Content <span className="text-timber-500 font-normal ml-2">Use {'{{name}}'} to insert the customer's first name.</span>
                </label>
                <textarea
                  value={html}
                  onChange={(e) => setHtml(e.target.value)}
                  className="w-full flex-1 min-h-[450px] rounded-lg border-timber-200 shadow-sm focus:border-timber-900 focus:ring-timber-900 font-mono text-xs p-3 bg-timber-50"
                  spellCheck="false"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Preview Side */}
        <div className={`bg-white rounded-xl shadow-sm border border-timber-100 overflow-hidden flex flex-col h-[700px] ${!previewMode ? 'hidden lg:flex' : 'flex'}`}>
          <div className="p-4 border-b border-timber-100 bg-timber-50">
            <h2 className="font-semibold text-timber-900">Live Preview</h2>
          </div>
          
          <div className="p-0 flex-1 bg-white overflow-y-auto">
            <div className="p-4 border-b border-gray-100 mb-4 bg-gray-50 text-sm">
              <span className="font-semibold text-gray-500 mr-2">Subject:</span>
              <span className="text-gray-900">{subject || 'No Subject'}</span>
            </div>
            <div 
              className="px-6 pb-6"
              dangerouslySetInnerHTML={{ __html: html.replace(/{{name}}/g, 'Ahmed') }}
            />
          </div>

          <div className="p-4 border-t border-timber-100 bg-timber-50">
            {!showConfirm ? (
              <button
                type="button"
                onClick={() => setShowConfirm(true)}
                className="w-full flex justify-center items-center gap-2 rounded-lg bg-timber-900 px-4 py-2.5 text-sm font-medium text-white shadow hover:bg-timber-800 transition-colors"
              >
                <Send className="w-4 h-4" />
                Broadcast to All Customers
              </button>
            ) : (
              <div className="bg-red-50 border border-red-200 p-4 rounded-lg">
                <div className="flex gap-3">
                  <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
                  <div>
                    <h4 className="text-sm font-semibold text-red-800">Confirm Broadcast</h4>
                    <p className="text-xs text-red-700 mt-1 mb-3">
                      This will send an email to every registered customer in your database. This action cannot be undone. Are you absolutely sure?
                    </p>
                    <div className="flex gap-2">
                      <button
                        onClick={handleSend}
                        disabled={isSending}
                        className="rounded bg-red-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-red-700 disabled:opacity-50"
                      >
                        {isSending ? 'Starting...' : 'Yes, Send Now'}
                      </button>
                      <button
                        onClick={() => setShowConfirm(false)}
                        disabled={isSending}
                        className="rounded bg-white px-3 py-1.5 text-xs font-semibold text-timber-700 border border-timber-300 hover:bg-timber-50"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
