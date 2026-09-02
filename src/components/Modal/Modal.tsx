import { useEffect, useRef, type ReactNode } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { IconClose } from "../../icons";
import styles from "./Modal.module.css";

interface Props {
  title: string;
  children: ReactNode;
  onClose: () => void;
  open: boolean;
}

export function Modal({ title, children, onClose, open }: Props) {
  const boxRef = useRef<HTMLDivElement>(null);

  // Escape to close, and keep the page behind from scrolling on mobile.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    boxRef.current?.focus();
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          className={styles.backdrop}
          onClick={onClose}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.16 }}
        >
          <motion.div
            ref={boxRef}
            className={styles.box}
            role="dialog"
            aria-modal="true"
            aria-label={title}
            tabIndex={-1}
            onClick={(e) => e.stopPropagation()}
            initial={{ opacity: 0, y: 24, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.98 }}
            transition={{ type: "spring", stiffness: 420, damping: 32 }}
          >
            <div className={styles.head}>
              <h2 className={styles.title}>{title}</h2>
              <button className={styles.close} onClick={onClose} aria-label="Close">
                <IconClose size={16} />
              </button>
            </div>
            <div className={styles.body}>{children}</div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
