// Reusable form primitives for CRUD screens. All consume useTheme().
import React from 'react';
import {
    Text,
    View,
    Pressable,
    TextInput,
    Modal,
    ScrollView,
    KeyboardAvoidingView,
    Platform,
    Alert,
    StyleSheet,
} from 'react-native';
import { Feather } from '@expo/vector-icons';
import { useTheme } from '@/theme/ThemeProvider';
import { AppText, Button } from '@/components/ui';

/** Labeled text input. */
export function Field({
    label,
    value,
    onChangeText,
    placeholder,
    keyboardType,
    secureTextEntry,
    multiline,
    autoCapitalize = 'none',
    editable = true,
}: {
    label: string;
    value: string;
    onChangeText: (v: string) => void;
    placeholder?: string;
    keyboardType?: 'default' | 'email-address' | 'numeric' | 'phone-pad' | 'decimal-pad';
    secureTextEntry?: boolean;
    multiline?: boolean;
    autoCapitalize?: 'none' | 'sentences' | 'words' | 'characters';
    editable?: boolean;
}) {
    const t = useTheme();
    return (
        <View style={{ gap: 6 }}>
            <AppText size="sm" muted weight="600">{label}</AppText>
            <TextInput
                value={value}
                onChangeText={onChangeText}
                placeholder={placeholder}
                placeholderTextColor={t.color.textMuted}
                keyboardType={keyboardType}
                secureTextEntry={secureTextEntry}
                multiline={multiline}
                autoCapitalize={autoCapitalize}
                editable={editable}
                style={{
                    backgroundColor: t.color.surfaceAlt,
                    borderRadius: t.radius.md,
                    borderWidth: 1,
                    borderColor: t.color.border,
                    paddingHorizontal: t.spacing.md,
                    paddingVertical: 12,
                    color: t.color.text,
                    fontSize: t.font.md,
                    minHeight: multiline ? 90 : 48,
                    textAlignVertical: multiline ? 'top' : 'center',
                    opacity: editable ? 1 : 0.6,
                }}
            />
        </View>
    );
}

/** Chip-style single-select for small option sets (status, type, assignment). */
export function Select<T extends string>({
    label,
    value,
    options,
    onChange,
}: {
    label: string;
    value?: T;
    options: { label: string; value: T }[];
    onChange: (v: T) => void;
}) {
    const t = useTheme();
    return (
        <View style={{ gap: 6 }}>
            <AppText size="sm" muted weight="600">{label}</AppText>
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                {options.map((o) => {
                    const active = o.value === value;
                    return (
                        <Pressable
                            key={o.value}
                            onPress={() => onChange(o.value)}
                            style={{
                                paddingHorizontal: 14,
                                paddingVertical: 9,
                                borderRadius: t.radius.pill,
                                backgroundColor: active ? t.color.brand : t.color.surfaceAlt,
                                borderWidth: 1,
                                borderColor: active ? t.color.brand : t.color.border,
                            }}
                        >
                            <Text style={{ color: active ? t.color.brandText : t.color.text, fontWeight: '600' }}>{o.label}</Text>
                        </Pressable>
                    );
                })}
            </View>
        </View>
    );
}

/** Bottom-sheet style modal wrapping a scrollable form with a submit button. */
export function FormModal({
    visible,
    title,
    onClose,
    onSubmit,
    submitting,
    submitLabel = 'Save',
    children,
}: {
    visible: boolean;
    title: string;
    onClose: () => void;
    onSubmit: () => void;
    submitting?: boolean;
    submitLabel?: string;
    children: React.ReactNode;
}) {
    const t = useTheme();
    return (
        <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
            <View style={{ flex: 1, backgroundColor: '#00000088', justifyContent: 'flex-end' }}>
                <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
                    <View
                        style={{
                            backgroundColor: t.color.bg,
                            borderTopLeftRadius: 22,
                            borderTopRightRadius: 22,
                            maxHeight: '92%',
                            paddingTop: t.spacing.lg,
                        }}
                    >
                        <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: t.spacing.lg, marginBottom: t.spacing.md }}>
                            <AppText size="lg" weight="800">{title}</AppText>
                            <Pressable onPress={onClose} hitSlop={10}>
                                <Feather name="x" size={24} color={t.color.textMuted} />
                            </Pressable>
                        </View>
                        <ScrollView contentContainerStyle={{ padding: t.spacing.lg, paddingTop: 0, gap: t.spacing.md }} keyboardShouldPersistTaps="handled">
                            {children}
                            <Button title={submitLabel} onPress={onSubmit} loading={submitting} style={{ marginTop: t.spacing.sm }} />
                            <View style={{ height: t.spacing.lg }} />
                        </ScrollView>
                    </View>
                </KeyboardAvoidingView>
            </View>
        </Modal>
    );
}

/** Floating action button (add). Place as a direct child of a non-scroll Screen. */
export function Fab({ onPress, icon = 'plus' }: { onPress: () => void; icon?: any }) {
    const t = useTheme();
    return (
        <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={{
                position: 'absolute',
                right: 20,
                bottom: 24,
                width: 56,
                height: 56,
                borderRadius: 28,
                backgroundColor: t.color.brand,
                alignItems: 'center',
                justifyContent: 'center',
                elevation: 4,
                shadowColor: '#000',
                shadowOpacity: 0.2,
                shadowRadius: 8,
                shadowOffset: { width: 0, height: 2 },
            }}
        >
            <Feather name={icon} size={26} color={t.color.brandText} />
        </Pressable>
    );
}

/** A tappable row used in list screens. */
export function ListRow({
    title,
    subtitle,
    right,
    onPress,
    onLongPress,
    leadingIcon,
}: {
    title: string;
    subtitle?: string;
    right?: React.ReactNode;
    onPress?: () => void;
    onLongPress?: () => void;
    leadingIcon?: any;
}) {
    const t = useTheme();
    return (
        <Pressable
            onPress={onPress}
            onLongPress={onLongPress}
            style={({ pressed }) => ({
                flexDirection: 'row',
                alignItems: 'center',
                gap: t.spacing.md,
                backgroundColor: t.color.surface,
                borderRadius: t.radius.lg,
                borderWidth: StyleSheet.hairlineWidth,
                borderColor: t.color.border,
                padding: t.spacing.md,
                opacity: pressed ? 0.85 : 1,
            })}
        >
            {leadingIcon ? (
                <View style={{ width: 38, height: 38, borderRadius: 10, backgroundColor: t.color.brand + '22', alignItems: 'center', justifyContent: 'center' }}>
                    <Feather name={leadingIcon} size={18} color={t.color.brand} />
                </View>
            ) : null}
            <View style={{ flex: 1, minWidth: 0 }}>
                <AppText weight="700" numberOfLines={1}>{title}</AppText>
                {subtitle ? <AppText size="sm" muted numberOfLines={1}>{subtitle}</AppText> : null}
            </View>
            {right}
        </Pressable>
    );
}

/** Confirm + run a destructive action. */
export function confirmDelete(message: string, onConfirm: () => void) {
    Alert.alert('Delete', message, [
        { text: 'Cancel', style: 'cancel' },
        { text: 'Delete', style: 'destructive', onPress: onConfirm },
    ]);
}
