import Modal from './Modal'
import Button from './Button'

/**
 * Generic "are you sure?" dialog built on Modal — first user of this pattern
 * is task delete (StaffDashboard), but nothing here is task-specific.
 *
 * @param {{
 *   open: boolean, onClose: () => void, onConfirm: () => void,
 *   title: string, description?: string,
 *   confirmLabel?: string, busy?: boolean, danger?: boolean,
 * }} props `danger` renders the confirm button as `destructive` (delete-style
 *   actions); otherwise it's `primary`.
 */
export default function ConfirmDialog({
  open,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  busy = false,
  danger = false,
}) {
  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      description={description}
      footer={
        <>
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button variant={danger ? 'destructive' : 'primary'} loading={busy} onClick={onConfirm}>
            {confirmLabel}
          </Button>
        </>
      }
    />
  )
}
