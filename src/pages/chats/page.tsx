import classes from './page.module.css';

/** Desktop placeholder while no chat is selected (on phones the list is shown instead). */
export function ChatsIndexPage() {
  return (
    <div className={classes.root}>
      <p className={classes.hint}>Выберите чат или начните новый</p>
    </div>
  );
}
