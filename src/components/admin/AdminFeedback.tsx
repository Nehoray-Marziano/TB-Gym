export function AdminLoading({ label }: { label: string }) {
    return <div className="studio-admin-load" role="status"><span className="studio-admin-spinner" aria-hidden="true" /><span>{label}</span></div>;
}

export function AdminError({ message, onRetry }: { message: string; onRetry?: () => void }) {
    return <div role="alert" className="studio-admin-error"><p>{message}</p>{onRetry && <button type="button" className="mt-2 min-h-11 font-bold underline underline-offset-4" onClick={onRetry}>ניסיון נוסף</button>}</div>;
}

export function AdminBusyLabel({ busy, idle, pending }: { busy: boolean; idle: string; pending: string }) {
    return <>{busy && <span aria-hidden="true" className="studio-admin-spinner" />}<span>{busy ? pending : idle}</span></>;
}
