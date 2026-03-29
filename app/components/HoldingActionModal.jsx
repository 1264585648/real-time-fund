'use client';

import { CloseIcon, SettingsIcon } from './Icons';
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from '@/components/ui/dialog';

export default function HoldingActionModal({ fund, onClose, onAction, hasHistory, pendingCount }) {
  const handleOpenChange = (open) => {
    if (!open) {
      onClose?.();
    }
  };

  return (
    <Dialog open onOpenChange={handleOpenChange}>
      <DialogContent
        showCloseButton={false}
        className="glass card modal"
        overlayClassName="modal-overlay"
        style={{ maxWidth: '320px', zIndex: 99 }}
      >
        <DialogTitle className="sr-only">持仓操作</DialogTitle>
        <div className="title" style={{ marginBottom: 20, justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <SettingsIcon width="20" height="20" />
            <span>持仓操作</span>
            <button
              type="button"
              className="button secondary"
              onClick={() => onAction('history')}
              style={{
                marginLeft: 8,
                padding: '4px 10px',
                fontSize: '12px',
                height: '28px',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                position: 'relative',
              }}
              title="查看交易记录"
            >
              <span>📜</span>
              <span>交易记录</span>
              {pendingCount > 0 && (
                <span
                  style={{
                    position: 'absolute',
                    top: -4,
                    right: -4,
                    width: 10,
                    height: 10,
                    borderRadius: '50%',
                    backgroundColor: '#ef4444',
                    border: '2px solid var(--background)',
                  }}
                />
              )}
            </button>
          </div>
          <button className="icon-button" onClick={onClose} style={{ border: 'none', background: 'transparent' }}>
            <CloseIcon width="20" height="20" />
          </button>
        </div>

        <div style={{ marginBottom: 20, textAlign: 'center' }}>
          <div className="fund-name" style={{ fontWeight: 600, fontSize: '16px', marginBottom: 4 }}>{fund?.name}</div>
          <div className="muted" style={{ fontSize: '12px' }}>#{fund?.code}</div>
        </div>

        <div className="grid" style={{ gap: 12 }}>
          <button
            className="button col-4"
            onClick={() => onAction('buy')}
            style={{ background: 'rgba(34, 211, 238, 0.1)', border: '1px solid var(--primary)', color: 'var(--primary)', fontSize: 14 }}
          >
            加仓
          </button>
          <button
            className="button col-4"
            onClick={() => onAction('sell')}
            style={{ background: 'rgba(248, 113, 113, 0.1)', border: '1px solid var(--danger)', color: 'var(--danger)', fontSize: 14 }}
          >
            减仓
          </button>
          <button
            className="button col-4 dca-btn"
            onClick={() => onAction('dca')}
            style={{ fontSize: 14 }}
          >
            定投
          </button>
          <button className="button col-12" onClick={() => onAction('edit')} style={{ background: 'rgba(255,255,255,0.05)', color: 'var(--text)' }}>
            编辑持仓
          </button>
          <button
            className="button col-12"
            onClick={() => onAction('clear')}
            style={{
              marginTop: 8,
              background: 'linear-gradient(180deg, #ef4444, #f87171)',
              border: 'none',
              color: '#2b0b0b',
              fontWeight: 600,
            }}
          >
            清空持仓
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
