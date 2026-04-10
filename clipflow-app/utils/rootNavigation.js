/**
 * Walks up to the outermost navigator (e.g. RootStack above tabs).
 */
export function navigateFromRoot(navigation, name, params) {
  let nav = navigation;
  while (nav?.getParent?.()) {
    nav = nav.getParent();
  }
  if (params != null) {
    nav.navigate(name, params);
  } else {
    nav.navigate(name);
  }
}
