import React from 'react';
import { View, Text, ScrollView, Pressable } from 'react-native';

// App-wide safety net: converts a JS render error into a readable screen
// instead of silently closing the app, and lets the user retry.
export class ErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { error: Error | null }
> {
    state: { error: Error | null } = { error: null };

    static getDerivedStateFromError(error: Error) {
        return { error };
    }

    componentDidCatch(error: Error) {
        // Surfaced in `adb logcat` / EAS device logs.
        console.error('[Onlive] Unhandled error:', error);
    }

    render() {
        const { error } = this.state;
        if (!error) return this.props.children;
        return (
            <ScrollView
                contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 24, backgroundColor: '#0a0f1e' }}
            >
                <Text style={{ color: '#fff', fontSize: 20, fontWeight: '800', marginBottom: 10 }}>
                    Something went wrong
                </Text>
                <Text selectable style={{ color: '#f87171', fontSize: 14, marginBottom: 14 }}>
                    {error.message}
                </Text>
                <Text selectable style={{ color: '#94a3b8', fontSize: 11, lineHeight: 16 }}>
                    {String(error.stack || '').slice(0, 1500)}
                </Text>
                <Pressable
                    onPress={() => this.setState({ error: null })}
                    style={{ marginTop: 22, backgroundColor: '#2dbc75', paddingVertical: 14, borderRadius: 10, alignItems: 'center' }}
                >
                    <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>Try again</Text>
                </Pressable>
                <View style={{ height: 40 }} />
            </ScrollView>
        );
    }
}
