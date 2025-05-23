import React, { useEffect, useMemo, useState } from "react";
import { Text, View, StyleSheet } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { StatusBar } from "expo-status-bar"
import FontAwesome from "@expo/vector-icons/FontAwesome";
import { ScrollView } from "react-native-gesture-handler";

import { StoryView, SizedBox, PostView } from "@/components";
import { Link } from "expo-router";
import { useDispatch, useSelector } from "react-redux";
import { CustomTheme } from "@/utils/types";
import { useTheme } from "@/hooks/useTheme";
import { getData } from "@/utils";
import { setUser } from "@/state/slices";

const createStyles = (theme: CustomTheme) => StyleSheet.create({
  container: {
    alignItems: 'center'
  }
});

export default function Index() {
  const baseurl = process.env.EXPO_PUBLIC_BASE_URL || "http://192.168.252.240:3000";
  const dispatch = useDispatch();
  const token = useSelector((state: any) => state.reelzUserToken.jwtToken);

  const theme = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const user = useSelector((state: any) => state.user);
  
  useEffect(() => {
    async function getUserData() {
      const loggedInUser = await getData(`${baseurl}/api/user`, token);
      const userData = await loggedInUser?.json();
      dispatch(setUser(userData.user[0]));
    }

    console.log("the user is:", user.username);

    if(!user.username) {
      getUserData();
    }
  }, []);

  return (
    <SafeAreaView style={{ backgroundColor: theme.background, flex: 1}}>
      <ScrollView>
      <View style={{ flex: 1, backgroundColor: theme.background, paddingHorizontal: 20, paddingTop: 20 }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
          <Text style={{color: "white", fontSize: 20}}>Reelz</Text>
          <View style={{ flexDirection: 'row', gap: 24 }}>
            <Link href={"/notifications"}>
              <FontAwesome name="heart-o" size={24} color={theme.text} />
            </Link>
            <Link href={"/messages"}>
              <FontAwesome name="envelope-o" size={24} color={theme.text} />
            </Link>
          </View>
        </View>
        <SizedBox height={14} />

        {/* Story View */}
        <ScrollView horizontal={true}>
          <StoryView />
        </ScrollView>

        {/* User Feed */}
        <PostView />
      </View>
      </ScrollView>
      <StatusBar style={theme.mode == 'dark' ? 'light' : 'dark'} />
    </SafeAreaView>
  );
}
