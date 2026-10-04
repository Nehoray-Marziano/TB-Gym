"use client";

import { useRef, useState, type ComponentPropsWithRef, type Ref } from "react";
import { cn } from "@/lib/utils";
import { CopyButton } from "./copy-button";

function assignRef<T>(ref: Ref<T> | undefined, element: T | null) {
    if (typeof ref === "function") return ref(element);
    if (ref) ref.current = element;
}

type CopyFieldOptions = { copyLabel: string; wrapperClassName?: string };

export function CopyableInput({ ref, copyLabel, wrapperClassName, className, dir, onChange, ...props }: ComponentPropsWithRef<"input"> & CopyFieldOptions) {
    const input = useRef<HTMLInputElement>(null);
    const [empty, setEmpty] = useState(!String(props.defaultValue ?? ""));
    const isEmpty = props.value === undefined ? empty : !String(props.value);
    return (
        <span className={cn("studio-copy-field", wrapperClassName)} dir={dir}>
            <input {...props} dir={dir} className={cn("min-h-12", className, "studio-copy-field-control")} ref={element => { input.current = element; return assignRef(ref, element); }} onChange={event => { setEmpty(!event.target.value); onChange?.(event); }} />
            <CopyButton label={copyLabel} value={() => input.current?.value ?? ""} disabled={props.disabled || isEmpty} className="studio-copy-field-action" />
        </span>
    );
}

export function CopyableTextarea({ ref, copyLabel, wrapperClassName, className, dir, onChange, ...props }: ComponentPropsWithRef<"textarea"> & CopyFieldOptions) {
    const input = useRef<HTMLTextAreaElement>(null);
    const [empty, setEmpty] = useState(!String(props.defaultValue ?? ""));
    const isEmpty = props.value === undefined ? empty : !String(props.value);
    return (
        <span className={cn("studio-copy-field studio-copy-field-multiline", wrapperClassName)} dir={dir}>
            <textarea {...props} dir={dir} className={cn(className, "studio-copy-field-control resize-none")} ref={element => { input.current = element; return assignRef(ref, element); }} onChange={event => { setEmpty(!event.target.value); onChange?.(event); }} />
            <CopyButton label={copyLabel} value={() => input.current?.value ?? ""} disabled={props.disabled || isEmpty} className="studio-copy-field-action" />
        </span>
    );
}
