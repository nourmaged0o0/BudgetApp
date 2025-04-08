import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity } from "react-native";
import { LinearGradient } from "expo-linear-gradient";
import axios from "axios";
import "../global.css";
import { useRouter } from "expo-router";

const API_URL = "https://fake-form.onrender.com/api/todo/register";

const Register = () => {
  const navigation = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState(""); 

  const handleRegister = async () => {
    if (!email || !password) {
      setErrorMessage("Please fill in all fields.");
      return;
    }

    try {
      await axios.post(API_URL, { email, password });
      setEmail("");
      setPassword("");
      setErrorMessage(""); 
      navigation.navigate("/Login");
    } catch (error) {
      console.error("Registration error:", error);
      const errorMsg =
        error.response?.data?.message || "Something went wrong. Try again.";
      setErrorMessage(errorMsg);
    }
  };

  return (
    <LinearGradient colors={["#1E1E2C", "#25273D"]} style={{ flex: 1 }}>
      <View className="flex-1 px-6 py-10 justify-center items-center">
        
        <Text className="text-4xl font-bold text-white mb-8">Create Account</Text>

        
        <TextInput
          className="border border-gray-500 p-4 w-4/5 rounded-lg bg-gray-800 text-white mb-4"
          placeholder="Email"
          placeholderTextColor="#AAA"
          keyboardType="email-address"
          value={email}
          onChangeText={(text) => {
            setEmail(text);
            setErrorMessage("");
          }}
        />

        <TextInput
          className="border border-gray-500 p-4 w-4/5 rounded-lg bg-gray-800 text-white mb-6"
          placeholder="Password"
          placeholderTextColor="#AAA"
          secureTextEntry={true}
          value={password}
          onChangeText={(text) => {
            setPassword(text);
            setErrorMessage(""); 
          }}
        />

        
        {errorMessage ? <Text className="text-red-500 mb-4">{errorMessage}</Text> : null}

        
        <TouchableOpacity
          onPress={handleRegister}
          className="bg-green-500 p-4 w-4/5 rounded-lg items-center mb-4"
        >
          <Text className="text-white font-bold text-lg">Register</Text>
        </TouchableOpacity>

        
        <TouchableOpacity onPress={() => navigation.navigate("Login")}>
          <Text className="text-green-400">Already have an account? Login</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

export default Register;
