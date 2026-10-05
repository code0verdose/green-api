import classes from './day-separator.module.css';

export function DaySeparator({ label }: { label: string }) {
  return (
    <div className={classes.root} role="separator" aria-label={label}>
      <span className={classes.label}>{label}</span>
    </div>
  );
}
