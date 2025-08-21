import { TypedUseSelectorHook, useDispatch, useSelector } from 'react-redux';

export const useAppDispatch: () => any = useDispatch;
export const useAppSelector: TypedUseSelectorHook<any> = useSelector;
