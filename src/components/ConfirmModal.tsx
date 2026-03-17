import { AnimatePresence, motion } from 'framer-motion';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmModal({ open, title, message, confirmLabel = 'Confirmar', onConfirm, onCancel }: Props) {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-foreground/20 backdrop-blur-sm px-4"
          onClick={onCancel}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            onClick={e => e.stopPropagation()}
            className="bg-card rounded-2xl border border-border p-6 shadow-lg w-full max-w-sm"
          >
            <h3 className="text-lg font-bold text-foreground font-display mb-2">{title}</h3>
            <p className="text-sm text-muted-foreground mb-6">{message}</p>
            <div className="flex gap-2">
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onCancel}
                className="flex-1 h-10 rounded-lg bg-secondary text-secondary-foreground text-sm font-medium"
              >
                Cancelar
              </motion.button>
              <motion.button
                whileTap={{ scale: 0.97 }}
                onClick={onConfirm}
                className="flex-1 h-10 rounded-lg bg-destructive text-destructive-foreground text-sm font-semibold"
              >
                {confirmLabel}
              </motion.button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
